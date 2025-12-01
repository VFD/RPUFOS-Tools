# Start HTTP Server
___
## Introduction

Project structure.

```
Project/
├── python/			Option with Python Embeded
│   └── ...
├── css/
│   └── *.css
├── js/
│   └── *.js
├── index.html
├── ...
```

- Project: any name you want


___
## Windows

### Python

Python must be installed on the computer.

Run the command directly in the project directory.

```
python -m http.server 8000
```

File Start-HttpServer.cmd.

```cmd
@echo off
REM Check if Python is installed
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [ERROR] Python is not installed or not found in PATH.
    echo Please install Python 3 from https://www.python.org/downloads/
    exit /b 1
)

echo [OK] Python detected.
echo Starting local server on port 8000...
python -m http.server 8000
```

Check if Python is available, and if so, start the server.

If it’s only for this purpose, just use the embedded Python. Place it in the root of the project.

Change the line:

```cmd
python -m http.server 8000
```
to:

```cmd
python\python -m http.server 8000
```


___
## PowerShell (5.1 and above)

Place the script in the directory:

```cmd
 %USERPROFILE%\Documents\WindowsPowerShell\Scripts
```

This is the default directory for the PowerShell IDE

### PowerShell IDE

- Start PowerShell IDE.
- Load the script.
- Run it.

The file config.json:

```json
{
    "appPath": "C:\\Temp\\Test\\ps2web",
    "port": 8000,
    "indexFile": "index.html"
}
```

- appPath: path to the site  
- port: site listening port  
- indexFile: site entry point  


### Powershell Console

For a proper configuration in Windows.

```

```



___
## *Nix

TO DO

### Bash



```bash
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
```

___
