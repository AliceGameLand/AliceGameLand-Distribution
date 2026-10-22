param([Parameter(Mandatory=$true)][string]$PackPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::Open($PackPath,[IO.Compression.ZipArchiveMode]::Update)
try {
    $entry=$archive.GetEntry('assets/minecraft/sounds.json')
    if($null -eq $entry){throw 'Minecraft sounds.json missing'}
    $reader=[IO.StreamReader]::new($entry.Open())
    try {$sounds=$reader.ReadToEnd() | ConvertFrom-Json} finally {$reader.Dispose()}
    $removed=0
    foreach($material in @('stone','wood')) {
        foreach($action in @('place','break','hit')) {
            $key="block.$material.$action"
            $property=$sounds.PSObject.Properties[$key]
            if($null -eq $property){continue}
            if($property.Value.replace -ne $true -or @($property.Value.sounds).Count -ne 0){throw "Unexpected non-muted definition: $key"}
            $sounds.PSObject.Properties.Remove($key)
            $removed++
        }
    }
    if($removed -gt 0) {
        $text=$sounds | ConvertTo-Json -Depth 100
        $entry.Delete()
        $entry=$archive.CreateEntry('assets/minecraft/sounds.json',[IO.Compression.CompressionLevel]::Optimal)
        $writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false))
        try {$writer.Write($text)} finally {$writer.Dispose()}
    }
    Write-Output "Removed muted sound definitions: $removed"
} finally {$archive.Dispose()}
