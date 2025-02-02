#!/bin/bash

# Exit on error
set -e

echo "Setting up Python environment..."

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
python3 -m pip install --upgrade pip

# Install requirements with verbose output
echo "Installing dependencies..."
python3 -m pip install -r requirements.txt --verbose

echo "Setup complete!"

# Start price updater
python3 api/price_updater.py