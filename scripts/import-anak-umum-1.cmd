@echo off
setlocal enabledelayedexpansion
rem ===========================================================================
rem  Impor folder "1000+ WORKSHEET ANAK UMUM 1" ke Supabase, tujuh gelombang.
rem
rem  Paket ini tidak tersusun menurut usia: satu folder memuat lembar menebalkan
rem  huruf untuk PAUD bersebelahan dengan tata bahasa SD, dan nama berkas adalah
rem  satu-satunya petunjuk. Karena itu tiap gelombang punya pola, rentang usia,
rem  dan domainnya sendiri.
rem
rem  Semua baris masuk sebagai DRAF. Tidak ada yang sampai ke orang tua sampai
rem  Anda menayangkannya dari dashboard.
rem
rem  Pemakaian:
rem    scripts\import-anak-umum-1.cmd dry   -> hanya menghitung, tidak menulis
rem    scripts\import-anak-umum-1.cmd       -> impor sungguhan
rem ===========================================================================

rem npm run membaca .env.local relatif terhadap direktori kerja, jadi semua
rem dijalankan dari akar proyek apa pun tempat berkas ini dipanggil.
pushd "%~dp0.."

set "FOLDER=%CD%\WORKSHEET\1000+ WORKSHEET ANAK UMUM 1"

rem Materi sekolah dasar. Disaring di setiap gelombang, bukan sekali di awal,
rem karena kata seperti "menghitung" muncul di lembar PAUD maupun soal SD.
set "SKIP=sekolah dasar|\bsd\b|majas|pancasila|sila (pertama|kedua|ketiga|keempat|kelima)|mengukur sudut|perkalian|pembagian|pecahan|soal cerita|organ tubuh|mengemukakan pendapat|membuat kalimat|pilihan ganda|bacaan|paragraf|sinonim|antonim|ganjil|genap|kata sifat|asesmen|deskripsi gambar|berpikir kritis|nilaiku|satuan|jam digital"

set "DRY="
if /i "%~1"=="dry" set "DRY=--dry-run"

if not exist "%FOLDER%" (
  echo Folder tidak ditemukan:
  echo   %FOLDER%
  echo Ubah baris FOLDER di berkas ini kalau lokasinya berbeda.
  popd
  exit /b 1
)

echo.
echo Folder : %FOLDER%
if defined DRY (echo Mode   : DRY RUN, tidak ada yang ditulis) else (echo Mode   : impor sungguhan, semua sebagai draf)
echo.

call :wave "menebali|menebalkan|huruf|alfabet|abjad"                                                          36-60 early_literacy literasi
call :wave "mewarnai|warnai"                                                                                   24-60 creativity     mewarnai
call :wave "gunting|tempel|melipat"                                                                            36-60 motor          gunting-tempel
call :wave "bentuk|geometri|besar|kecil|panjang|pendek|berat|ringan|kiri|kanan|pola"                            30-60 cognitive      bentuk-ukuran
call :wave "memasangkan|menghubungkan|mencocok|melingkari|mengurutkan|perbedaan|yang sama|labirin|pasangan|mengelompokkan" 30-60 cognitive mencocokkan
call :wave "menghitung|berhitung|bilangan 1|angka"                                                             36-60 early_numeracy berhitung
call :wave "mengenal|satwa|hewan|binatang|tanaman|planet|transportasi|profesi|lalu lintas|tradisional|cuaca"    36-60 language       mengenal-dunia

echo.
echo Selesai. Buka dashboard untuk memeriksa dan menayangkan:
echo   https://teduhati.vercel.app/id/admin/konten/lembar-kerja
popd
exit /b 0

rem ---------------------------------------------------------------------------
rem  %1 pola  %2 rentang usia  %3 domain  %4 folder di dalam bucket
rem ---------------------------------------------------------------------------
:wave
echo --- %~4 (usia %~2, domain %~3)
call npm run worksheets:import -- --dir "%FOLDER%" --age %~2 --domain %~3 --prefix %~4 --match "%~1" --exclude "%SKIP%" %DRY%
if errorlevel 1 (
  echo.
  echo Gelombang "%~4" gagal. Gelombang berikutnya dilewati.
  echo Berkas yang sudah masuk tidak akan terimpor dua kali, jadi aman dijalankan lagi.
  popd
  exit /b 1
)
echo.
goto :eof
