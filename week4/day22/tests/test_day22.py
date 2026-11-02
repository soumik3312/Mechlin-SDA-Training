"""Automated tests for Day 22 AI/ML fundamentals."""

from __future__ import annotations

from pathlib import Path

import pytest

from ai.data_pipeline import DataPipeline
from ai.models import MLModelFactory
from ai.train import build_demo_dataset


def test_pipeline_split_and_model_training():
    """Verify preprocessing, splitting, training, and evaluation."""

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

    assert len(X_train) + len(X_test) == len(data)

    assert X_train.shape[1] == X_test.shape[1]

    assert set(
        y_train.unique()
    ).issubset({0, 1})

    factory = MLModelFactory()

    model = factory.create_classifier(
        "random_forest",
        n_estimators=30,
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

    assert 0.0 <= metrics["accuracy"] <= 1.0

    assert set(metrics) == {
        "accuracy",
        "precision",
        "recall",
        "f1_score",
    }


def test_pipeline_persistence_and_unknown_category(
    tmp_path: Path,
):
    """Verify saving, loading, and unknown category handling."""

    data = build_demo_dataset()

    pipeline = DataPipeline()

    pipeline.split_data(
        data,
        target_column="target",
    )

    artifact = tmp_path / "pipeline.joblib"

    pipeline.save_pipeline(
        artifact
    )

    assert artifact.exists()

    restored = DataPipeline()

    restored.load_pipeline(
        artifact
    )

    sample = (
        data.drop(columns=["target"])
        .iloc[[0]]
        .copy()
    )

    sample["segment"] = "new_unseen_segment"

    transformed = restored.transform_input(
        sample
    )

    assert transformed.shape[0] == 1

    assert transformed.shape[1] > 0


def test_ai_service_prediction_and_batch_routes(
    tmp_path: Path,
):
    """Verify Flask endpoints using temporary model artifacts."""

    pytest.importorskip("flask")

    from ai.ai_service import AIService

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

    model = factory.train_model(
        factory.create_classifier(
            "random_forest",
            n_estimators=25,
        ),
        X_train,
        y_train,
    )

    model.training_metrics_ = pipeline.evaluate_model(
        model,
        X_test,
        y_test,
    )

    model_path = tmp_path / "classifier.joblib"

    pipeline_path = tmp_path / "pipeline.joblib"

    factory.save_model(
        model,
        model_path,
    )

    pipeline.save_pipeline(
        pipeline_path,
    )

    service = AIService(
        model_path,
        pipeline_path,
    )

    client = service.app.test_client()

    health = client.get("/health")

    assert health.status_code == 200

    assert health.json["status"] == "healthy"

    info = client.get("/ai/model/info")

    assert info.status_code == 200

    row = (
        data.drop(columns=["target"])
        .iloc[0]
        .to_dict()
    )

    single = client.post(
        "/ai/predict",
        json=row,
    )

    assert single.status_code == 200

    assert single.json["success"] is True

    assert single.json["prediction"] in {
        "priority",
        "standard",
    }

    assert (
        single.json["confidence"] is None
        or 0.0 <= single.json["confidence"] <= 1.0
    )

    batch_rows = (
        data.drop(columns=["target"])
        .iloc[:3]
        .to_dict(orient="records")
    )

    batch = client.post(
        "/ai/batch-predict",
        json=batch_rows,
    )

    assert batch.status_code == 200

    assert batch.json["success"] is True

    assert len(batch.json["predictions"]) == 3

    invalid = client.post(
        "/ai/predict",
        json={
            "unknown_feature": 1
        },
    )

    assert invalid.status_code == 400

    assert invalid.json["success"] is False


def test_unsupported_model_type_is_clear():
    """Verify invalid model names produce a useful error."""

    with pytest.raises(
        ValueError,
        match="Unsupported model type",
    ):
        MLModelFactory().create_classifier(
            "not-a-model"
        )