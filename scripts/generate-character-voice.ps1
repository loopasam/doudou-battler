param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,

  [string]$CharacterName = 'Luna',

  [string]$VoiceName = 'Microsoft Zira Desktop'
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$resolvedOutput = (Resolve-Path -LiteralPath $OutputDirectory).Path

function ConvertTo-XmlText {
  param([string]$Value)
  return [System.Security.SecurityElement]::Escape($Value)
}

function Write-VoiceReaction {
  param(
    [string]$Path,
    [string]$SapiXml
  )

  $voice = New-Object -ComObject SAPI.SpVoice
  $stream = New-Object -ComObject SAPI.SpFileStream
  try {
    $matchingVoice = $voice.GetVoices("Name=$VoiceName").Item(0)
    if ($null -ne $matchingVoice) {
      $voice.Voice = $matchingVoice
    }
    $stream.Open($Path, 3, $false)
    $voice.AudioOutputStream = $stream
    [void]$voice.Speak($SapiXml, 8)
  }
  finally {
    try { $stream.Close() } catch { }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($stream)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($voice)
  }
}

$safeName = ConvertTo-XmlText $CharacterName
$winXml = @"
<pitch absmiddle="4"><rate speed="-1">Laa</rate></pitch>
<silence msec="55"/>
<pitch absmiddle="7"><rate speed="0">la laaa!</rate></pitch>
<silence msec="100"/>
<pitch absmiddle="3"><rate speed="1">Sparkles and starlight!</rate></pitch>
<silence msec="80"/>
<pitch absmiddle="6"><rate speed="0">$safeName shines bright!</rate></pitch>
"@

$loseXml = @"
<pitch absmiddle="2"><rate speed="-2">Ooh...</rate></pitch>
<silence msec="120"/>
<pitch absmiddle="-2"><rate speed="-1">my sparkle slipped.</rate></pitch>
<silence msec="90"/>
<pitch absmiddle="3"><rate speed="1">I'll gallop back!</rate></pitch>
"@

Write-VoiceReaction -Path (Join-Path $resolvedOutput 'win-voice.wav') -SapiXml $winXml
Write-VoiceReaction -Path (Join-Path $resolvedOutput 'lose-voice.wav') -SapiXml $loseXml

Get-ChildItem -LiteralPath $resolvedOutput -Filter '*-voice.wav' |
  Select-Object Name, Length, FullName
