#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install required backend libraries
pip install -r requirements.txt

# Compile static framework properties
python manage.py collectstatic --no-input

# Run pending tables configurations onto our Neon Cloud Cluster
python manage.py migrate