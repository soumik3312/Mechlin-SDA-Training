"""Train a demo classifier and save model artifacts."""

from __future__ import annotations

import json
import logging

from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from sklearn.datasets import make_classification

from ai.data_pipeline import DataPipeline
from ai.models import MLModelFactory


def build_demo_dataset() -> pd.DataFrame:
    """Generate a deterministic synthetic classification dataset."""

    features, target = make_classification(
        n_samples=600,
        n_features=5,
        n_informative=4,
        n_redundant=1,
        n_classes=2,
        weights=[0.55, 0.45],
        class_sep=1.1,
        random_state=42,
    )

    data = pd.DataFrame(
        features,
        columns=[
            "feature_1",
            "feature_2",
            "feature_3",
            "feature_4",
            "feature_5",
        ],
    )

    data["segment"] = np.where(
        data["feature_1"] >= 0,
        "segment_a",
        "segment_b",
    )

    data["target"] = np.where(
        target == 1,
        "priority",
        "standard",
    )

    return data


def train_demo(
    output_directory: Optional[Path] = None,
) -> dict:
    """Run the full demonstration training workflow."""

    logging.basicConfig(
        level=logging.INFO,
        format=(
            "%(asctime)s %(levelname)s "
            "%(name)s: %(message)s"
        ),
    )

    artifacts = (
        output_directory
        or Path(__file__).resolve().parent / "models"
    )

    artifacts.mkdir(
        parents=True,
        exist_ok=True,
    )

    data = build_demo_dataset()

    pipeline = DataPipeline()

    (
        X_train,
        X_test,
        y_train,
        y_test,
    ) = pipeline.split_data(
        data,
        target_column="target",
    )

    factory = MLModelFactory()

    model = factory.create_classifier(
        "random_forest",
        n_estimators=150,
    )

    factory.train_model(
        model,
        X_train,
        y_train,
    )

    metrics = pipeline.evaluate_model(
        model,
        X_test,
        y_test,
    )

    model.training_metrics_ = metrics
    model.model_version_ = "1.0.0"

    model_path = (
        artifacts / "classifier.joblib"
    )

    pipeline_path = (
        artifacts / "preprocessing_pipeline.joblib"
    )

    metadata_path = (
        artifacts / "model_metadata.json"
    )

    factory.save_model(
        model,
        model_path,
    )

    pipeline.save_pipeline(
        pipeline_path,
    )

    metadata = {
        "name": type(model).__name__,
        "version": "1.0.0",
        "metrics": metrics,
        "training_rows": int(len(X_train)),
        "testing_rows": int(len(X_test)),
    }

    metadata_path.write_text(
        json.dumps(
            metadata,
            indent=2,
        ),
        encoding="utf-8",
    )

    result = {
        "model_path": str(model_path),
        "pipeline_path": str(pipeline_path),
        "metrics": metrics,
    }

    print(
        json.dumps(
            result,
            indent=2,
        )
    )

    return result


if __name__ == "__main__":
    train_demo()