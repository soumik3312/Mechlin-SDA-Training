"""Data loading, preprocessing, splitting, evaluation, and persistence."""

from __future__ import annotations

import logging

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler


class DataPipeline:
    """Reusable preprocessing pipeline for classification datasets."""

    def __init__(self) -> None:
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()

        self.preprocessor: Optional[ColumnTransformer] = None

        self.feature_columns: List[str] = []
        self.numeric_columns: List[str] = []
        self.categorical_columns: List[str] = []

        self.target_column: Optional[str] = None

        self.logger = logging.getLogger(
            self.__class__.__name__
        )

    def load_data(
        self,
        file_path: Union[str, Path],
    ) -> pd.DataFrame:
        """Load CSV, JSON, or Parquet data."""

        path = Path(file_path)
        suffix = path.suffix.lower()

        readers = {
            ".csv": pd.read_csv,
            ".json": pd.read_json,
            ".parquet": pd.read_parquet,
            ".pq": pd.read_parquet,
        }

        if suffix not in readers:
            raise ValueError(
                "Unsupported file format. "
                "Use CSV, JSON, or Parquet."
            )

        try:
            data = readers[suffix](path)

            if data.empty:
                raise ValueError(
                    f"The input file contains no rows: {path}"
                )

            self.logger.info(
                "Loaded data with shape %s from %s",
                data.shape,
                path,
            )

            return data

        except Exception:
            self.logger.exception(
                "Failed to load data from %s",
                path,
            )
            raise

    def _build_preprocessor(
        self,
        features: pd.DataFrame,
    ) -> None:
        """Build numerical and categorical transformations."""

        if features.empty or not len(features.columns):
            raise ValueError(
                "The dataset must contain at least one feature."
            )

        self.feature_columns = list(
            features.columns
        )

        self.numeric_columns = (
            features.select_dtypes(
                include=[np.number]
            )
            .columns.tolist()
        )

        self.categorical_columns = [
            column
            for column in self.feature_columns
            if column not in self.numeric_columns
        ]

        transformers = []

        if self.numeric_columns:
            numeric_pipeline = Pipeline(
                steps=[
                    (
                        "imputer",
                        SimpleImputer(strategy="median"),
                    ),
                    (
                        "scaler",
                        self.scaler,
                    ),
                ]
            )

            transformers.append(
                (
                    "numeric",
                    numeric_pipeline,
                    self.numeric_columns,
                )
            )

        if self.categorical_columns:
            categorical_pipeline = Pipeline(
                steps=[
                    (
                        "imputer",
                        SimpleImputer(strategy="most_frequent"),
                    ),
                    (
                        "encoder",
                        OneHotEncoder(
                            handle_unknown="ignore"
                        ),
                    ),
                ]
            )

            transformers.append(
                (
                    "categorical",
                    categorical_pipeline,
                    self.categorical_columns,
                )
            )

        self.preprocessor = ColumnTransformer(
            transformers=transformers,
            remainder="drop",
            verbose_feature_names_out=False,
        )

    def _transform_features(
        self,
        features: pd.DataFrame,
        fit: bool = False,
    ) -> pd.DataFrame:
        """Apply fitted feature transformations."""

        if self.preprocessor is None:
            raise RuntimeError(
                "The preprocessing pipeline has not been fitted."
            )

        missing_columns = [
            column
            for column in self.feature_columns
            if column not in features.columns
        ]

        if missing_columns:
            raise ValueError(
                f"Missing required feature columns: {missing_columns}"
            )

        aligned = features.loc[
            :,
            self.feature_columns,
        ].copy()

        if fit:
            transformed = self.preprocessor.fit_transform(
                aligned
            )
        else:
            transformed = self.preprocessor.transform(
                aligned
            )

        feature_names = (
            self.preprocessor.get_feature_names_out()
        )

        if hasattr(transformed, "toarray"):
            transformed = transformed.toarray()

        return pd.DataFrame(
            transformed,
            columns=feature_names,
            index=aligned.index,
        )

    def preprocess_data(
        self,
        data: pd.DataFrame,
        target_column: Optional[str] = None,
        fit: bool = True,
    ) -> pd.DataFrame:
        """Clean and transform a complete dataset.

        For model evaluation, use split_data() because it fits
        preprocessing on training data only.
        """

        if not isinstance(data, pd.DataFrame) or data.empty:
            raise ValueError(
                "data must be a non-empty pandas DataFrame."
            )

        cleaned = data.drop_duplicates().copy()

        if target_column is not None:
            if target_column not in cleaned.columns:
                raise ValueError(
                    f"Target column '{target_column}' was not found."
                )

            cleaned = cleaned.dropna(
                subset=[target_column]
            )

            if cleaned.empty:
                raise ValueError(
                    "No rows remain after removing missing targets."
                )

            features = cleaned.drop(
                columns=[target_column]
            )

            target = cleaned[target_column].astype(str)

        else:
            features = cleaned
            target = None

        if fit:
            self._build_preprocessor(features)

            transformed = self._transform_features(
                features,
                fit=True,
            )

            if target is not None:
                self.label_encoder.fit(target)
                self.target_column = target_column

        else:
            transformed = self._transform_features(
                features,
                fit=False,
            )

        if target is not None:
            if not hasattr(self.label_encoder, "classes_"):
                raise RuntimeError(
                    "The target label encoder has not been fitted."
                )

            transformed[target_column] = (
                self.label_encoder.transform(target)
            )

        self.logger.info(
            "Preprocessed data with shape %s",
            transformed.shape,
        )

        return transformed

    def split_data(
        self,
        data: pd.DataFrame,
        target_column: str,
        test_size: float = 0.2,
    ) -> Tuple[
        pd.DataFrame,
        pd.DataFrame,
        pd.Series,
        pd.Series,
    ]:
        """Split raw data and fit transformations on training rows only."""

        if not isinstance(data, pd.DataFrame) or data.empty:
            raise ValueError(
                "data must be a non-empty DataFrame."
            )

        if target_column not in data.columns:
            raise ValueError(
                f"Target column '{target_column}' was not found."
            )

        if not 0 < test_size < 1:
            raise ValueError(
                "test_size must be greater than 0 and less than 1."
            )

        cleaned = (
            data.drop_duplicates()
            .dropna(subset=[target_column])
            .copy()
        )

        if len(cleaned) < 2:
            raise ValueError(
                "At least two valid rows are required."
            )

        features = cleaned.drop(
            columns=[target_column]
        )

        target = cleaned[target_column].astype(str)

        self.label_encoder.fit(target)

        encoded_target = pd.Series(
            self.label_encoder.transform(target),
            index=target.index,
            name=target_column,
        )

        if encoded_target.nunique() < 2:
            raise ValueError(
                "Classification requires at least two target classes."
            )

        class_counts = encoded_target.value_counts()

        test_count = int(
            np.ceil(len(cleaned) * test_size)
        )

        train_count = len(cleaned) - test_count

        can_stratify = (
            len(class_counts) > 1
            and int(class_counts.min()) >= 2
            and test_count >= len(class_counts)
            and train_count >= len(class_counts)
        )

        (
            X_train_raw,
            X_test_raw,
            y_train,
            y_test,
        ) = train_test_split(
            features,
            encoded_target,
            test_size=test_size,
            random_state=42,
            stratify=(
                encoded_target
                if can_stratify
                else None
            ),
        )

        if y_train.nunique() < 2:
            raise ValueError(
                "Training split contains fewer than two classes. "
                "Use a larger dataset or a different test_size."
            )

        self.target_column = target_column

        self._build_preprocessor(
            X_train_raw
        )

        X_train = self._transform_features(
            X_train_raw,
            fit=True,
        )

        X_test = self._transform_features(
            X_test_raw,
            fit=False,
        )

        self.logger.info(
            "Data split - Train: %s, Test: %s",
            X_train.shape,
            X_test.shape,
        )

        return (
            X_train,
            X_test,
            y_train,
            y_test,
        )

    def transform_input(
        self,
        data: Union[
            Dict[str, Any],
            List[Dict[str, Any]],
            pd.DataFrame,
        ],
    ) -> pd.DataFrame:
        """Transform a prediction object or batch."""

        if isinstance(data, dict):
            frame = pd.DataFrame([data])

        elif isinstance(data, list):
            if not data or not all(
                isinstance(item, dict)
                for item in data
            ):
                raise ValueError(
                    "Batch input must be a non-empty list of objects."
                )

            frame = pd.DataFrame(data)

        elif isinstance(data, pd.DataFrame):
            frame = data.copy()

        else:
            raise TypeError(
                "Input must be a dictionary, list of dictionaries, "
                "or pandas DataFrame."
            )

        return self._transform_features(
            frame,
            fit=False,
        )

    def decode_predictions(
        self,
        predictions: Any,
    ) -> List[str]:
        """Convert encoded predictions into their original labels."""

        if not hasattr(self.label_encoder, "classes_"):
            raise RuntimeError(
                "The target label encoder has not been fitted."
            )

        values = np.asarray(
            predictions
        ).astype(int)

        return self.label_encoder.inverse_transform(
            values
        ).tolist()

    def evaluate_model(
        self,
        model: Any,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Calculate classification metrics."""

        predictions = model.predict(X_test)

        metrics = {
            "accuracy": float(
                accuracy_score(
                    y_test,
                    predictions,
                )
            ),
            "precision": float(
                precision_score(
                    y_test,
                    predictions,
                    average="weighted",
                    zero_division=0,
                )
            ),
            "recall": float(
                recall_score(
                    y_test,
                    predictions,
                    average="weighted",
                    zero_division=0,
                )
            ),
            "f1_score": float(
                f1_score(
                    y_test,
                    predictions,
                    average="weighted",
                    zero_division=0,
                )
            ),
        }

        self.logger.info(
            "Model evaluation metrics: %s",
            metrics,
        )

        return metrics

    def save_pipeline(
        self,
        file_path: Union[str, Path],
    ) -> None:
        """Save the fitted preprocessing pipeline."""

        if self.preprocessor is None:
            raise RuntimeError(
                "Cannot save a pipeline before fitting it."
            )

        path = Path(file_path)
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        joblib.dump(
            self,
            path,
        )

        self.logger.info(
            "Pipeline saved to %s",
            path,
        )

    def load_pipeline(
        self,
        file_path: Union[str, Path],
    ) -> None:
        """Load a previously saved DataPipeline."""

        loaded = joblib.load(file_path)

        if not isinstance(loaded, DataPipeline):
            raise TypeError(
                "The saved artifact is not a DataPipeline."
            )

        self.__dict__.update(
            loaded.__dict__
        )

        self.logger.info(
            "Pipeline loaded from %s",
            file_path,
        )