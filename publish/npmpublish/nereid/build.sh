#!/usr/bin/env bash
set -eu

LINUX_ARCH='amd64 i686 arm64 armel'

rm -rf ffmpeg-*
rm -rf .tmp
mkdir .tmp

for ARCH in $LINUX_ARCH; do
  mkdir -p ffmpeg-linux-$ARCH
  curl https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-$ARCH-static.tar.xz | tar xJf - -C .tmp
  cp .tmp/ffmpeg-*-$ARCH-static/ffmpeg ffmpeg-linux-$ARCH
  chmod +x ffmpeg-linux-$ARCH/ffmpeg
done

mkdir -p ffmpeg-windows-amd64
curl -L -o .tmp/ffmpeg-win.zip https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
unzip .tmp/ffmpeg-win.zip -d .tmp
cp .tmp/ffmpeg-*-essentials_build/bin/ffmpeg.exe ffmpeg-windows-amd64

mkdir -p ffmpeg-macos-amd64
curl -L -o .tmp/ffmpeg-macos.zip https://evermeet.cx/ffmpeg/getrelease/zip
unzip .tmp/ffmpeg-macos.zip -d .tmp
cp .tmp/ffmpeg ffmpeg-macos-amd64
chmod +x ffmpeg-macos-amd64/ffmpeg

FOLDERS='ffmpeg-linux-amd64 ffmpeg-linux-arm64 ffmpeg-linux-armel ffmpeg-linux-i686 ffmpeg-windows-amd64 ffmpeg-macos-amd64'
for BUCKET in $FOLDERS; do
  yarn nereid-cli build $BUCKET
done

rm -rf .tmp
