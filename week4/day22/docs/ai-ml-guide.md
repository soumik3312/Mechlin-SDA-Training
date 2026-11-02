# AI/ML Guide

## Machine Learning Fundamentals

### Artificial Intelligence

Artificial Intelligence (AI) is the broader field of building
systems capable of performing tasks associated with human
intelligence, including perception, reasoning, decision-making,
and problem-solving.

### Machine Learning

Machine Learning (ML) is a branch of AI in which algorithms
learn patterns from data and use those patterns to make
predictions or decisions.

### Types of Machine Learning

**1. Supervised Learning**

Supervised learning trains models using labelled datasets.

Examples:
- Classification
- Regression
- Spam detection
- Customer churn prediction

**2. Unsupervised Learning**

Unsupervised learning discovers patterns and structures
from unlabelled datasets.

Examples:
- Clustering
- Customer segmentation
- Dimensionality reduction

**3. Reinforcement Learning**

Reinforcement learning trains an agent through interaction
with an environment using rewards and penalties.

Examples:
- Robotics
- Game-playing agents
- Autonomous decision-making

### Deep Learning

Deep Learning is a subset of Machine Learning that uses
multi-layer neural networks to learn complex representations
from data.

Applications include:
- Image recognition
- Speech recognition
- Natural Language Processing
- Generative AI

---

## Data Pipelines and Preprocessing

A data pipeline is a sequence of operations that transforms
raw data into a format suitable for machine learning.

### Pipeline Stages

1. Data collection
2. Data validation
3. Data cleaning
4. Missing-value handling
5. Feature engineering
6. Feature transformation
7. Training and testing split
8. Model evaluation

### Data Cleaning

Data cleaning includes:
- Removing duplicate records.
- Handling missing values.
- Correcting inconsistent data.
- Validating data types.
- Detecting invalid values.

### Feature Scaling

Feature scaling ensures numerical features are represented
on comparable scales.

StandardScaler transforms values using:

z = (x - mean) / standard deviation

### Categorical Encoding

Categorical variables must be converted into numerical
representations before being passed to most ML algorithms.

The Day 22 implementation uses OneHotEncoder for
categorical input features.

### Missing Values

The implementation uses:
- Median imputation for numerical features.
- Most-frequent-value imputation for categorical features.

### Preventing Data Leakage

Preprocessing transformations must be fitted on training data
only.

The fitted transformations are then applied to testing and
production data.

This ensures that test-set information does not influence
the training process.

---

## Model Training and Inference

### Model Training

Model training is the process of learning patterns from
training data.

The Day 22 implementation provides a model factory supporting:

- Random Forest Classifier
- Gradient Boosting Classifier
- Logistic Regression
- Support Vector Machine
- Multi-layer Perceptron
- XGBoost Classifier (optional dependency)

### Model Inference

Model inference means using an already-trained model
to produce predictions for new input data.

The inference workflow is:

1. Receive input data.
2. Validate the incoming features.
3. Apply saved preprocessing transformations.
4. Pass transformed features to the trained model.
5. Generate predictions.
6. Calculate prediction confidence when supported.
7. Return the result through the API.

### Model Persistence

A trained model and its preprocessing pipeline must be
saved so they can be loaded later without retraining.

The implementation uses Joblib for model persistence.

Only trusted model artifacts should be loaded because
serialized Python objects can execute code during loading.

### Batch Inference

Batch inference processes multiple records in a single
request.

It can reduce repeated request overhead and improve
processing efficiency.

---

## Model Evaluation

Machine learning models must be evaluated using
appropriate performance metrics.

### Accuracy

Accuracy measures the fraction of correct predictions.

### Precision

Precision measures the fraction of positive predictions
that are actually correct.

### Recall

Recall measures the fraction of actual positive examples
that the model correctly identifies.

### F1 Score

F1 Score is the harmonic mean of precision and recall.

### Validation

A reliable evaluation process separates:

- Training data
- Validation data
- Testing data

The testing dataset should remain separate from model
training and hyperparameter selection.

### Day 22 Metrics

The DataPipeline evaluation method calculates:

- Accuracy
- Weighted precision
- Weighted recall
- Weighted F1 score

The synthetic dataset is intended for demonstration,
not for estimating production model performance.

---

## AI Applications

### Natural Language Processing

NLP enables systems to analyse, understand, and generate
human language.

Applications:
- Text classification
- Sentiment analysis
- Text summarization
- Language translation

### Computer Vision

Computer vision enables machines to interpret images
and videos.

Applications:
- Object detection
- Image classification
- Facial recognition
- Medical image analysis

### Recommendation Systems

Recommendation systems suggest relevant content,
products, or services based on user preferences and
behaviour.

### Predictive Analytics

Predictive analytics uses historical data to estimate
future outcomes.

### AI Agents

AI agents combine models, state, tools, and control logic
to perform multi-step tasks.

---

## Best Practices

### Data Quality

Use accurate, representative, permissioned data.
Document its source, limitations, and preparation steps.

### Model Selection

Choose algorithms based on:
- Dataset size
- Feature characteristics
- Model complexity
- Inference performance
- Evaluation metrics

Prefer the simplest model that satisfies the requirements.

### Performance Optimization

Evaluate:
- Inference latency
- Throughput
- Memory consumption
- Training time
- Prediction accuracy

### Model Monitoring

Monitor:
- Prediction quality
- Input data distributions
- Data drift
- Model drift
- API response times
- Error rates
- Service health

### Security

- Validate API inputs.
- Protect model artifacts.
- Restrict access to sensitive data.
- Never commit API keys or passwords.
- Use HTTPS in production.
- Apply authentication and authorization.
- Avoid exposing development servers publicly.

### Responsible AI

Responsible AI development should consider:

- Fairness
- Transparency
- Privacy
- Accountability
- Security
- Human oversight

Model output should not be treated as unquestionable
truth.

High-impact decisions should have appropriate human
review and escalation procedures.

---

## Running the Day 22 Implementation

From the week4/day22 directory:

### 1. Install dependencies

```powershell
python -m pip install -r requirements.txt