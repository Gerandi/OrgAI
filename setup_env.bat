@echo off
echo Deleting existing venv directory if it exists...
if exist venv rmdir /s /q venv

echo Creating Python virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies from requirements.txt...
pip install -r backend/requirements.txt

echo Done! Virtual environment is ready.
echo To activate it, run: venv\Scripts\activate.bat