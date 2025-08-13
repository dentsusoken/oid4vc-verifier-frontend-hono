@echo off
setlocal enabledelayedexpansion

echo Verifier Frontend�̃Z�b�g�A�b�v���J�n���܂��B
echo ���s����ɂ�Enter�L�[�������Ă��������B
pause > nul

:: �e���W���[���̃f�B���N�g����ݒ�
set "CURRENT_DIR=%CD%"
set "BUILD_DIR=%CURRENT_DIR%\build"
set "CORE_DIR=%BUILD_DIR%\oid4vc-core"
set "PREX_DIR=%BUILD_DIR%\oid4vc-prex"
set "CBOR_DIR=%BUILD_DIR%\mdoc-cbor-ts"

:: �G���[�n���h�����O�֐�
:handle_error
if errorlevel 1 (
    echo �G���[���������܂���: %~1
    exit /b 1
)

:: �N���[���A�b�v�֐�
:cleanup
echo �N���[���A�b�v�����s���܂�...
if exist "%BUILD_DIR%" (
    rmdir /s /q "%BUILD_DIR%" || echo �x��: build�f�B���N�g���̍폜�Ɏ��s���܂���
)
 if errorlevel 1 (
    exit /b 0
)

:: build �f�B���N�g���̑��݊m�F�ƍ쐬
if not exist "%BUILD_DIR%" (
    mkdir "%BUILD_DIR%" || (
        call :handle_error "build�f�B���N�g���̍쐬�Ɏ��s"
    )
)

:: ���W���[�����N���[��
cd "%BUILD_DIR%" || (
    call :handle_error "build�f�B���N�g���ւ̈ړ��Ɏ��s"
)

echo oid4vc-core���N���[�����Ă��܂�...
git clone https://github.com/dentsusoken/oid4vc-core || (
    call :handle_error "oid4vc-core�̃N���[���Ɏ��s"
)

echo oid4vc-prex���N���[�����Ă��܂�...
git clone https://github.com/dentsusoken/oid4vc-prex || (
    call :handle_error "oid4vc-prex�̃N���[���Ɏ��s"
)

echo mdoc-cbor-ts���N���[�����Ă��܂�...
git clone https://github.com/dentsusoken/mdoc-cbor-ts || (
    call :handle_error "mdoc-cbor-ts�̃N���[���Ɏ��s"
)

echo oid4vc-core���r���h���Ă��܂�...
cd "%CORE_DIR%" || (
    call :handle_error "oid4vc-core�f�B���N�g���ւ̈ړ��Ɏ��s"
)
call git checkout ed7a39cc8fe30d82a475bcb8c847bd5f953277da
call npm install 
call npm run build || (
    call :handle_error "oid4vc-core�̃r���h�Ɏ��s"
)
call npm link || (
    call :handle_error "oid4vc-core��npm link�Ɏ��s"
)

echo oid4vc-prex���r���h���Ă��܂�...
cd "%PREX_DIR%" || (
    call :handle_error "oid4vc-prex�f�B���N�g���ւ̈ړ��Ɏ��s"
)
call git checkout 66ff55ffecd250d3c7e673717875e0ec444f56cf
call npm install 
call npm link oid4vc-core || (
    call :handle_error "oid4vc-core�̃����N�Ɏ��s"
)
call npm run build || (
    call :handle_error "oid4vc-prex�̃r���h�Ɏ��s"
)
call npm link || (
    call :handle_error "oid4vc-prex��npm link�Ɏ��s"
)

echo mdoc-cbor-ts���r���h���Ă��܂�...
cd "%CBOR_DIR%" || (
    call :handle_error "mdoc-cbor-ts�f�B���N�g���ւ̈ړ��Ɏ��s"
)
call git checkout d6bc31260b3a6ea9b85a950e1e38fa46019c07c0
call npm install 
call npm link oid4vc-core oid4vc-prex || (
    call :handle_error "�ˑ����W���[���̃����N�Ɏ��s"
)
call npm run build || (
    call :handle_error "mdoc-cbor-ts�̃r���h�Ɏ��s"
)
call npm link || (
    call :handle_error "mdoc-cbor-ts��npm link�Ɏ��s"
)

echo oid4vc-verifier-frontend-hono���r���h���Ă��܂�...
cd .. || (
    call :handle_error "oid4vc-verifier-frontend-hono�f�B���N�g���ւ̈ړ��Ɏ��s"
)
call npm install 
call npm link oid4vc-core oid4vc-prex mdoc-cbor-ts || (
    call :handle_error "�ˑ����W���[���̃����N�Ɏ��s"
)

echo Verifier Frontend�̃Z�b�g�A�b�v���������܂����B

echo �I������ɂ�Enter�L�[�������Ă��������B
pause > nul

exit /b 0 