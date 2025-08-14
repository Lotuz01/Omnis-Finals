# Script para facilitar o uso dos arquivos Docker movidos para E:\Docker
# Execute este script para usar os comandos Docker com os arquivos no drive E:

# Definir variáveis de ambiente para os caminhos dos arquivos Docker
$env:DOCKER_FILES_PATH = "E:\Docker"
$env:COMPOSE_FILE = "E:\Docker\docker-compose.yml"
$env:COMPOSE_FILE_MYSQL = "E:\Docker\docker-compose.mysql.yml"
$env:COMPOSE_FILE_TEST = "E:\Docker\docker-compose.test.yml"

Write-Host "=== Docker Helper Script ===" -ForegroundColor Green
Write-Host "Arquivos Docker movidos para: E:\Docker" -ForegroundColor Yellow
Write-Host ""
Write-Host "Comandos disponíveis:" -ForegroundColor Cyan
Write-Host "1. docker-compose -f E:\Docker\docker-compose.yml up -d" -ForegroundColor White
Write-Host "2. docker-compose -f E:\Docker\docker-compose.mysql.yml up -d" -ForegroundColor White
Write-Host "3. docker-compose -f E:\Docker\docker-compose.test.yml up" -ForegroundColor White
Write-Host "4. docker build -f E:\Docker\Dockerfile -t sistema-gestao ." -ForegroundColor White
Write-Host ""
Write-Host "Aliases criados:" -ForegroundColor Cyan

# Criar aliases para facilitar o uso
function Start-DockerCompose {
    docker-compose -f "E:\Docker\docker-compose.yml" up -d
}

function Start-DockerMySQL {
    docker-compose -f "E:\Docker\docker-compose.mysql.yml" up -d
}

function Start-DockerTest {
    docker-compose -f "E:\Docker\docker-compose.test.yml" up
}

function Build-DockerImage {
    docker build -f "E:\Docker\Dockerfile" -t sistema-gestao .
}

function Stop-DockerCompose {
    docker-compose -f "E:\Docker\docker-compose.yml" down
}

# Registrar aliases
Set-Alias -Name "dc-up" -Value Start-DockerCompose
Set-Alias -Name "dc-mysql" -Value Start-DockerMySQL
Set-Alias -Name "dc-test" -Value Start-DockerTest
Set-Alias -Name "dc-build" -Value Build-DockerImage
Set-Alias -Name "dc-down" -Value Stop-DockerCompose

Write-Host "Aliases disponíveis:" -ForegroundColor Green
Write-Host "- dc-up     : Iniciar docker-compose principal" -ForegroundColor White
Write-Host "- dc-mysql  : Iniciar docker-compose MySQL" -ForegroundColor White
Write-Host "- dc-test   : Iniciar docker-compose de testes" -ForegroundColor White
Write-Host "- dc-build  : Construir imagem Docker" -ForegroundColor White
Write-Host "- dc-down   : Parar docker-compose" -ForegroundColor White
Write-Host ""
Write-Host "Para usar este script automaticamente, adicione ao seu perfil do PowerShell:" -ForegroundColor Yellow
Write-Host "Add-Content $PROFILE '. .\docker-helper.ps1'" -ForegroundColor Gray