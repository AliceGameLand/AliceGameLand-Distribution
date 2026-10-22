param(
    [string]$PackPath = 'C:\Users\gptnr\Desktop\AliceGameLand-Distribution\release-assets\resourcepacks--pack.zip'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Reuse an existing transparent sprite without modifying or generating bitmap pixels.
$archive = [IO.Compression.ZipFile]::Open($PackPath, [IO.Compression.ZipArchiveMode]::Update)
try {
    $source = $archive.GetEntry('assets/minecraft/textures/32f58674-89ae-4a88-89ec-897f7798bb6b.png')
    if ($null -eq $source) { throw 'Transparent source sprite missing.' }
    $buffer = [IO.MemoryStream]::new()
    $stream = $source.Open()
    try { $stream.CopyTo($buffer) } finally { $stream.Dispose() }
    $bytes = $buffer.ToArray()
    $buffer.Dispose()
    foreach ($name in @('pink_background.png', 'pink_progress.png')) {
        $path = "assets/minecraft/textures/gui/sprites/boss_bar/$name"
        $entry = $archive.GetEntry($path)
        if ($null -ne $entry) { $entry.Delete() }
        $entry = $archive.CreateEntry($path, [IO.Compression.CompressionLevel]::Optimal)
        $stream = $entry.Open()
        try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
    }
    $langPath = 'assets/minecraft/lang/ko_kr.json'
    $entry = $archive.GetEntry($langPath)
    if ($null -eq $entry) { throw 'Korean language file missing.' }
    $reader = [IO.StreamReader]::new($entry.Open(), [Text.Encoding]::UTF8)
    try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $lang = $text | ConvertFrom-Json
    $oldName = [string]$lang.'menu.returnToGame'
    if ($oldName -notin @('§e앨더랜드로 돌아가기', '§e앨리스의 게임랜드')) {
        throw "Unexpected return button text: $oldName"
    }
    $text = $text.Replace('앨더랜드로 돌아가기', '앨리스의 게임랜드')
    $entry.Delete()
    $entry = $archive.CreateEntry($langPath, [IO.Compression.CompressionLevel]::Optimal)
    $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($text) } finally { $writer.Dispose() }
} finally { $archive.Dispose() }
Get-FileHash -LiteralPath $PackPath -Algorithm SHA256
Get-FileHash -LiteralPath $PackPath -Algorithm MD5
Get-Item -LiteralPath $PackPath | Select-Object FullName, Length
