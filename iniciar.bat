@echo off
setlocal
cd /d "%~dp0"

echo Iniciando o Apoio ao Estudante...
echo (esta janela precisa ficar aberta enquanto voce estiver usando o sistema)
echo.

REM --- Passo 1: Node.js e obrigatorio - sem ele o sistema nao roda ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] O Node.js nao foi encontrado nesta maquina.
    echo.
    echo O sistema precisa do Node.js para funcionar. Baixe e instale em:
    echo   https://nodejs.org
    echo ^(baixe a versao "LTS" e siga o instalador com as opcoes padrao^)
    echo.
    echo Depois de instalar, feche esta janela e clique de novo em iniciar.bat.
    echo.
    pause
    exit /b 1
)

REM --- Passo 2: Ollama e opcional - só afeta a geracao por IA, nao trava o sistema ---
where ollama >nul 2>nul
if errorlevel 1 (
    echo [AVISO] O Ollama nao foi encontrado nesta maquina.
    echo O sistema vai funcionar normalmente, so que gerando as atividades
    echo pelo motor por regras em vez de IA. Se quiser ativar a IA local e
    echo gratuita, instale o Ollama em:
    echo   https://ollama.com/download
    echo e depois rode "ollama pull qwen2.5:7b" em um terminal. Veja o passo
    echo a passo completo no README.md.
    echo.
) else (
    REM Ollama esta instalado - confere se o modelo recomendado ja foi baixado
    ollama list 2>nul | findstr /i "qwen2.5" >nul
    if errorlevel 1 (
        echo O modelo de IA recomendado ^(qwen2.5:7b^) ainda nao esta baixado
        echo nesta maquina. Baixando agora - isso acontece so uma vez e pode
        echo levar alguns minutos, dependendo da internet ^(uns 4,7 GB^)...
        echo.
        ollama pull qwen2.5:7b
        if errorlevel 1 (
            echo.
            echo [AVISO] Nao foi possivel baixar o modelo agora ^(sem internet,
            echo ou o Ollama ainda nao abriu em segundo plano^). O sistema vai
            echo continuar funcionando pelo motor por regras ate o modelo ser
            echo baixado. Pode tentar de novo mais tarde rodando
            echo "ollama pull qwen2.5:7b" em um terminal.
            echo.
        )
    )
)

start "" cmd /c "timeout /t 2 >nul && start http://127.0.0.1:3000"

node server\index.js

echo.
echo O servidor foi encerrado.
pause
