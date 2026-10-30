# 🧠 Mental Health Signal — Student Wellness Analytics & Prediction

An end-to-end Machine Learning web application that predicts a student's **Mental Health Score** (ranging on a continuous scale from 0 to 10) based on their social media habits, screen time, sleep rhythm, physical activity, academic pressure, and stress levels.

The application allows users to toggle between two distinct machine learning models — **Random Forest** and **Linear Regression** — served by a high-performance **FastAPI** backend and visualized on an interactive, animated **HTML/CSS/JavaScript** frontend dashboard.

---

## 📖 Project Overview

Student mental health is deeply influenced by digital habits and daily routines. This project models that relationship empirically:
- **Core Objective:** Provide an objective indicator of wellness from daily behavioral metrics rather than clinical diagnosis.
- **Dual Machine Learning Pipelines:** Includes both a tuned **Random Forest** model (for non-linear pattern capture) and a baseline **Linear Regression** model (for linear factor analysis).
- **Service Layer:** A RESTful API built with **FastAPI** and typed with **Pydantic** that validates incoming student data, supports runtime model selection, and clamps output scores safely to a 0–10 scale.
- **Client Interface:** A responsive, vanilla JavaScript single-page interface featuring dynamic model toggling, real-time client validation, asynchronous `fetch` integration, and smooth SVG sun/arc gauge animations.

---

## 🚀 Setup & How to Run (For New Users)

Follow these steps if you are running this project from a freshly cloned repository.

### Prerequisites
- **Python 3.10+** installed on your system. Verify with:
  ```bash
  python --version
  ```
- **Git** (if cloning from a remote repository).

---

### Step 1: Clone the Repository & Navigate to Project Directory

```bash
git clone <repository-url>
cd ML-Project-Mental-Health-Score
```

---

### Step 2: Create a Virtual Environment

A virtual environment keeps project dependencies isolated from other Python packages on your computer.

```bash
# On Windows / macOS / Linux:
python -m venv venv
```

---

### Step 3: Activate the Virtual Environment

- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If you get a script execution policy error in PowerShell, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first, then rerun the command).*

- **Windows (Command Prompt / CMD):**
  ```cmd
  .\venv\Scripts\activate.bat
  ```

- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

When activated, you will see `(venv)` prepended to your command line prompt.

---

### Step 4: Install Required Packages

Install all backend dependencies specified in `requirements.txt`:

```bash
pip install -r requirements.txt
```

---

### Step 5: Run the Backend API

Start the FastAPI backend server using `uvicorn`:

```bash
uvicorn main:app --reload
```

- **Local API Base:** `http://127.0.0.1:8000`
- **Interactive API Documentation (Swagger UI):** Open `http://127.0.0.1:8000/docs` in your browser to inspect and test all API routes directly.

---

### Step 6: Run the Frontend Application

#### A. Configure API Base URL (Local vs. Cloud)
Open `script.js` in a code editor and check line 4:
```javascript
const API_BASE = "http://127.0.0.1:8000";
```
*Note: When running locally with your FastAPI server from Step 5, ensure `API_BASE` is set to `http://127.0.0.1:8000`. If deploying to a remote host (e.g., Render), change this to your live server URL.*

#### B. Launch the Web Page in Browser
Open a new terminal window or run the command for your operating system:

- **Windows (PowerShell or CMD):**
  ```powershell
  start index.html
  ```
- **macOS:**
  ```bash
  open index.html
  ```
- **Linux:**
  ```bash
  xdg-open index.html
  ```

*Alternative (Local Static Server):*
You can also run a simple local web server:
```bash
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.

---

## 📁 Project Files & Architecture

Here is the role of each file in the repository:

| File Name | Category | Description |
| :--- | :--- | :--- |
| **`index.html`** | Frontend | The user-facing web interface. Contains the lifestyle habit form, model selector toggle (Random Forest / Linear Regression), and dynamic SVG animated score arc. |
| **`style.css`** | Frontend | The styling sheet defining the visual layout: dark tone theme, responsive card grids, button states, and SVG arc gauge animations. |
| **`script.js`** | Frontend | Client-side JavaScript handling form data extraction, client-side validation, asynchronous `fetch` calls to the backend, model switching, and animated score rendering. |
| **`main.py`** | Backend API | The FastAPI application server. Preloads both ML models at startup, defines Pydantic schemas (`StudentData`, `PredictionResponse`), handles CORS, and exposes `/models` and `/predict`. |
| **`Mental_Health_Model_RF.pkl`** | Machine Learning | Serialized Scikit-Learn pipeline for the tuned **Random Forest** model (preprocessing + regressor). |
| **`Mental_Health_Model_LR.pkl`** | Machine Learning | Serialized Scikit-Learn pipeline for the baseline **Linear Regression** model (preprocessing + regressor). |
| **`requirements.txt`** | Configuration | Manifest listing all necessary Python libraries (`fastapi`, `uvicorn`, `pydantic`, `joblib`, `pandas`, `scikit-learn`). |
| **`ML_Project.ipynb`** | Data Science / Research | Jupyter Notebook detailing Exploratory Data Analysis (EDA), feature cleaning, pipeline assembly, training both models, hyperparameter tuning (`RandomizedSearchCV`), and model export. |
| **`Student Social Media And Mental Health Impact.csv`** | Dataset | Tabular dataset containing 5,000 student survey records across 13 behavioral, academic, and psychological attributes. |

---

## 🔬 Technical Details

### 1. Machine Learning Pipelines
- **Target Variable:** `Mental_Health_Score` (continuous numeric score from 0.0 to 10.0).
- **Preprocessing via `ColumnTransformer`:**
  - *Skewed Numeric (`Study_Hours`):* Transformed via `FunctionTransformer(np.log1p)` followed by `StandardScaler()`.
  - *Standard Numeric (`Age`, `Avg_Daily_Usage_Hours`, `Daily_Unlocks`, `Physical_Activity_Hours`, `Sleep_Hours_Per_Night`):* Scaled using `StandardScaler()`.
  - *Ordinal Categorical (`Stress_Level`):* Encoded into `['Low', 'Medium', 'High', 'Very High']` using `OrdinalEncoder()`.
  - *Nominal Categorical (`Gender`, `Academic_Level`, `Most_Used_Platform`, `Purpose_Of_Use`, `Grouped_country`):* Encoded with `OneHotEncoder(handle_unknown='ignore')`.
- **Pretrained Models:**
  - **Random Forest (`Mental_Health_Model_RF.pkl`):** Hyperparameter-tuned with `RandomizedSearchCV` ($R^2 \approx 0.87$, $\text{MAE} \approx 0.35$). Best suited for capturing non-linear interactions.
  - **Linear Regression (`Mental_Health_Model_LR.pkl`):** Baseline linear model ($R^2 \approx 0.74$, $\text{MAE} \approx 0.54$).

Both pipelines encapsulate their full preprocessing workflow, allowing raw input records to be passed directly to `.predict()` without manual data preparation.

---

### 2. API Contract

#### `GET /models`
Returns the available model choices:
```json
[
  { "key": "random_forest", "label": "Random Forest" },
  { "key": "linear_regression", "label": "Linear Regression" }
]
```

#### `POST /predict`

**Request Payload Sample:**
```json
{
  "age": 21,
  "gender": "Female",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "Instagram",
  "purpose_of_use": "Entertainment",
  "avg_daily_usage_hours": 4.5,
  "daily_unlocks": 120,
  "study_hours": 3.0,
  "physical_activity_hours": 1.5,
  "sleep_hours_per_night": 7.0,
  "stress_level": "Medium",
  "selected_model": "random_forest"
}
```

**Response Payload Sample:**
```json
{
  "predicted_mental_health_score": 6.85,
  "selected_model": "random_forest"
}
```

---

## 🌐 Cloud Deployment (e.g. Render)

When deploying to cloud platforms such as [Render](https://render.com):
1. Connect your repository as a **Web Service**.
2. **Build Command:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Start Command:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Update `API_BASE` in `script.js` to point to your live Render URL.

## Author - Chetanya Mittal
