

# base pour tauri



mon-projet/
 ├─ index.html              # point d'entrée
 ├─ css/
 │   └─ style.css           # styles
 ├─ js/
 │   └─ app.js              # JavaScript
 ├─ assets/                 # images, logos, etc.
 │   └─ logo.png
 ├─ icons/                  # icônes pour Tauri
 │   ├─ icon.png
 │   ├─ icon.ico
 │   └─ icon.icns
 ├─ src-tauri/              # backend Rust pour Tauri
 │   ├─ Cargo.toml
 │   ├─ tauri.conf.json
 │   └─ src/
 │       └─ main.rs
 └─ .github/
     └─ workflows/
         ├─ build-tauri.yml # workflow pour générer les binaires
         └─ pages.yml       # workflow pour déployer sur Pages




tauri.conf.json

```
{
  "package": {
    "productName": "MonApp",
    "version": "0.1.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["exe", "dmg", "appimage"],
      "identifier": "com.monapp",
      "icon": [
        "icons/icon.png",
        "icons/icon.ico",
        "icons/icon.icns"
      ]
    },
    "build": {
      "distDir": ".",
      "devPath": "."
    }
  }
}

```

Tauri est configuré pour prendre la racine (".") comme source.

GitHub Pages publie le site avec cette structure


