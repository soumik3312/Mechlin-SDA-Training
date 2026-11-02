"""Flask API for serving predictions from saved ML artifacts."""

from __future__ import annotations

import argparse
import logging
import os

from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import joblib
import numpy as np

from flask import Flask, jsonify, request
from flask_cors import CORS

from ai.data_pipeline import DataPipeline


class AIService:
    """Flask-based machine learning inference service."""

    def __init__(
        self,
        model_path: Union[str, Path],
        pipeline_path: Union[str, Path],
    ) -> None:

        model_file = Path(model_path)
        pipeline_file = Path(pipeline_path)

        if not model_file.is_file():
            raise FileNotFoundError(
                f"Model artifact not found: {model_file}"
            )

        if not pipeline_file.is_file():
            raise FileNotFoundError(
                f"Pipeline artifact not found: {pipeline_file}"
            )

        self.app = Flask(__name__)

        self.app.config["MAX_CONTENT_LENGTH"] = (
            1 * 1024 * 1024
        )

        self.logger = logging.getLogger(
            self.__class__.__name__
        )

        self.model = joblib.load(
            model_file
        )

        self.model.artifact_path_ = str(
            model_file
        )

        self.pipeline = DataPipeline()

        self.pipeline.load_pipeline(
            pipeline_file
        )

        allowed_origins = [
            origin.strip()
            for origin in os.getenv(
                "AI_ALLOWED_ORIGINS",
                (
                    "http://localhost:3000,"
                    "http://localhost:5173,"
                    "http://localhost:8081,"
                    "http://127.0.0.1:3000,"
                    "http://127.0.0.1:5173"
                ),
            ).split(",")
            if origin.strip()
        ]

        CORS(
            self.app,
            resources={
                r"/ai/*": {
                    "origins": allowed_origins
                }
            },
        )

        self.setup_routes()

    def setup_routes(self) -> None:
        """Register Flask API routes."""

        @self.app.get("/health")
        def health():
            return jsonify(
                {
                    "status": "healthy",
                    "model_loaded": (
                        self.model is not None
                    ),
                    "pipeline_loaded": (
                        self.pipeline.preprocessor is not None
                    ),
                }
            )

        @self.app.get("/ai/model/load")
        def load_model():
            return jsonify(
                {
                    "success": True,
                    "model": self.get_model_info(),
                }
            )

        @self.app.get("/ai/model/info")
        def model_info():
            return jsonify(
                self.get_model_info()
            )

        @self.app.post("/ai/predict")
        @self.app.post("/predict")
        def predict():
            payload = request.get_json(
                silent=True
            )

            if not isinstance(payload, dict):
                return jsonify(
                    {
                        "success": False,
                        "error": "Expected a JSON object.",
                    }
                ), 400

            try:
                result = self._predict_records(
                    [payload]
                )[0]

                return jsonify(
                    {
                        "success": True,
                        **result,
                    }
                )

            except (
                TypeError,
                ValueError,
                KeyError,
            ) as exc:

                self.logger.warning(
                    "Invalid prediction request: %s",
                    exc,
                )

                return jsonify(
                    {
                        "success": False,
                        "error": str(exc),
                    }
                ), 400

            except Exception:

                self.logger.exception(
                    "Prediction failed."
                )

                return jsonify(
                    {
                        "success": False,
                        "error": "Prediction failed.",
                    }
                ), 500

        @self.app.post("/ai/batch-predict")
        @self.app.post("/batch_predict")
        def batch_predict():

            payload = request.get_json(
                silent=True
            )

            if (
                not isinstance(payload, list)
                or not payload
            ):
                return jsonify(
                    {
                        "success": False,
                        "error": (
                            "Expected a non-empty JSON array."
                        ),
                    }
                ), 400

            if not all(
                isinstance(item, dict)
                for item in payload
            ):
                return jsonify(
                    {
                        "success": False,
                        "error": (
                            "Every batch item must be a JSON object."
                        ),
                    }
                ), 400

            try:
                results = self._predict_records(
                    payload
                )

                return jsonify(
                    {
                        "success": True,

                        "predictions": [
                            item["prediction"]
                            for item in results
                        ],

                        "confidences": [
                            item["confidence"]
                            for item in results
                        ],

                        "results": results,
                    }
                )

            except (
                TypeError,
                ValueError,
                KeyError,
            ) as exc:

                self.logger.warning(
                    "Invalid batch request: %s",
                    exc,
                )

                return jsonify(
                    {
                        "success": False,
                        "error": str(exc),
                    }
                ), 400

            except Exception:

                self.logger.exception(
                    "Batch prediction failed."
                )

                return jsonify(
                    {
                        "success": False,
                        "error": "Batch prediction failed.",
                    }
                ), 500

    def preprocess_input(
        self,
        data: Any,
    ):
        """Apply the saved preprocessing pipeline."""

        return self.pipeline.transform_input(
            data
        )

    def _predict_records(
        self,
        records: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:

        processed = self.preprocess_input(
            records
        )

        encoded_predictions = np.asarray(
            self.model.predict(processed)
        ).reshape(-1)

        labels = self.pipeline.decode_predictions(
            encoded_predictions
        )

        if hasattr(self.model, "predict_proba"):

            probabilities = np.asarray(
                self.model.predict_proba(processed)
            )

            confidences: List[Optional[float]] = [
                float(value)
                for value in np.max(
                    probabilities,
                    axis=1,
                )
            ]

        else:
            confidences = [
                None
                for _ in labels
            ]

        return [
            {
                "prediction": label,
                "confidence": confidence,
            }
            for label, confidence in zip(
                labels,
                confidences,
            )
        ]

    def make_prediction(
        self,
        data: Dict[str, Any],
    ) -> str:

        return self._predict_records(
            [data]
        )[0]["prediction"]

    def make_batch_predictions(
        self,
        data: List[Dict[str, Any]],
    ) -> List[str]:

        return [
            item["prediction"]
            for item in self._predict_records(data)
        ]

    def get_confidence(
        self,
        data: Dict[str, Any],
    ) -> Optional[float]:

        return self._predict_records(
            [data]
        )[0]["confidence"]

    def get_model_info(self) -> Dict[str, Any]:

        metrics = getattr(
            self.model,
            "training_metrics_",
            {},
        )

        model_path = getattr(
            self.model,
            "artifact_path_",
            None,
        )

        timestamp = None

        if (
            model_path
            and Path(model_path).exists()
        ):
            timestamp = Path(
                model_path
            ).stat().st_mtime

        return {
            "name": type(self.model).__name__,

            "version": getattr(
                self.model,
                "model_version_",
                "1.0.0",
            ),

            "accuracy": metrics.get(
                "accuracy"
            ),

            "trainingMetrics": metrics,

            "lastUpdated": timestamp,
        }

    def run(
        self,
        host: str = "0.0.0.0",
        port: int = 5000,
    ) -> None:

        self.logger.info(
            "Starting AI service on %s:%s",
            host,
            port,
        )

        self.app.run(
            host=host,
            port=port,
            debug=False,
        )


def main() -> None:

    parser = argparse.ArgumentParser(
        description="Run the Day 22 AI prediction API."
    )

    default_directory = (
        Path(__file__).resolve().parent / "models"
    )

    parser.add_argument(
        "--model",
        default=str(
            default_directory / "classifier.joblib"
        ),
    )

    parser.add_argument(
        "--pipeline",
        default=str(
            default_directory / "preprocessing_pipeline.joblib"
        ),
    )

    parser.add_argument(
        "--host",
        default="0.0.0.0",
    )

    parser.add_argument(
        "--port",
        type=int,
        default=5000,
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO
    )

    service = AIService(
        args.model,
        args.pipeline,
    )

    service.run(
        host=args.host,
        port=args.port,
    )


if __name__ == "__main__":
    main()