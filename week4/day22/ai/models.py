"""Factory for supported machine learning classifiers."""

from __future__ import annotations

import logging

from pathlib import Path
from typing import Any, Union

import joblib

from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
)

from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC


class MLModelFactory:
    """Create, train, save, and load classification models."""

    def __init__(self) -> None:
        self.logger = logging.getLogger(
            self.__class__.__name__
        )

    def create_classifier(
        self,
        model_type: str,
        **kwargs: Any,
    ) -> Any:
        """Create a classifier using its registered model name."""

        normalized = model_type.strip().lower()

        factories = {
            "random_forest": lambda: RandomForestClassifier(
                n_estimators=kwargs.get(
                    "n_estimators",
                    100,
                ),
                max_depth=kwargs.get(
                    "max_depth",
                    None,
                ),
                random_state=42,
                n_jobs=kwargs.get(
                    "n_jobs",
                    -1,
                ),
            ),

            "gradient_boosting": lambda: GradientBoostingClassifier(
                n_estimators=kwargs.get(
                    "n_estimators",
                    100,
                ),
                learning_rate=kwargs.get(
                    "learning_rate",
                    0.1,
                ),
                random_state=42,
            ),

            "logistic_regression": lambda: LogisticRegression(
                random_state=42,
                max_iter=kwargs.get(
                    "max_iter",
                    1000,
                ),
            ),

            "svm": lambda: SVC(
                kernel=kwargs.get(
                    "kernel",
                    "rbf",
                ),
                probability=True,
                random_state=42,
            ),

            "neural_network": lambda: MLPClassifier(
                hidden_layer_sizes=kwargs.get(
                    "hidden_layer_sizes",
                    (100,),
                ),
                random_state=42,
                max_iter=kwargs.get(
                    "max_iter",
                    1000,
                ),
            ),
        }

        if normalized == "xgboost":
            try:
                from xgboost import XGBClassifier

            except ImportError as exc:
                raise ImportError(
                    "XGBoost is optional. Install it using: "
                    "python -m pip install 'xgboost>=2,<4'"
                ) from exc

            return XGBClassifier(
                n_estimators=kwargs.get(
                    "n_estimators",
                    100,
                ),
                learning_rate=kwargs.get(
                    "learning_rate",
                    0.1,
                ),
                random_state=42,
                n_jobs=kwargs.get(
                    "n_jobs",
                    -1,
                ),
                eval_metric="logloss",
            )

        if normalized not in factories:
            supported = sorted(
                list(factories) + ["xgboost"]
            )

            raise ValueError(
                f"Unsupported model type '{model_type}'. "
                f"Supported types: {', '.join(supported)}"
            )

        return factories[normalized]()

    def train_model(
        self,
        model: Any,
        X_train: Any,
        y_train: Any,
    ) -> Any:
        """Train the selected classification model."""

        self.logger.info(
            "Training model: %s",
            type(model).__name__,
        )

        model.fit(
            X_train,
            y_train,
        )

        self.logger.info(
            "Model training completed."
        )

        return model

    def save_model(
        self,
        model: Any,
        file_path: Union[str, Path],
    ) -> None:
        """Save a trained model."""

        path = Path(file_path)

        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        joblib.dump(
            model,
            path,
        )

        self.logger.info(
            "Model saved to %s",
            path,
        )

    def load_model(
        self,
        file_path: Union[str, Path],
    ) -> Any:
        """Load a previously saved model."""

        model = joblib.load(file_path)

        self.logger.info(
            "Model loaded from %s",
            file_path,
        )

        return model