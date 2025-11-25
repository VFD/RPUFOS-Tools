# Charger la configuration
$config = Get-Content -Raw -Path ".\config.json" | ConvertFrom-Json

# Paramètres du serveur
$appPath = $config.appPath
$port = $config.port
$indexFile = $config.indexFile

# Vérification des paramètres
if (-not (Test-Path $appPath)) {
    Write-Host "Chemin de l'application invalide: $appPath"
    exit
}

# Création du serveur HTTP
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Serveur démarré sur http://localhost:$port/"
Write-Host "Chemin de l'application: $appPath"

# Boucle principale du serveur
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Gestion du chemin
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/$indexFile"
        }

        $filePath = Join-Path $appPath $localPath.TrimStart('/')

        # Servir les fichiers
        if (Test-Path $filePath) {
            $content = Get-Content $filePath -Raw
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
            
            # Déterminer le type de contenu
            $extension = [System.IO.Path]::GetExtension($filePath)
            $contentType = switch ($extension) {
                ".html" { "text/html" }
                ".css"  { "text/css" }
                ".js"   { "application/javascript" }
                ".json" { "application/json" }
                default { "text/plain" }
            }

            $response.ContentType = $contentType
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        else {
            $response.StatusCode = 404
            $errorMessage = "Fichier non trouvé: $filePath"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errorMessage)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }

        $response.Close()
    }
}
catch {
    Write-Host "Erreur du serveur: $_"
}
finally {
    $listener.Stop()
}
