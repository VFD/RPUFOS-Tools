#!/bin/bash

# chmod +x Start-HttpServer.sh


# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python3 is not installed or not found in PATH."
    echo "Please install Python 3 from https://www.python.org/downloads/"
    exit 1
fi

echo "[OK] Python3 detected."
echo "Starting local server on port 8000..."
python3 -m http.server 8000
