<!DOCTYPE html>
<html>

<head>

    <meta charset="utf-8">

    <style>

        body{
            font-family: DejaVu Sans;
            font-size:12px;
            line-height:1.5;
        }

        h2{
            text-align:center;
        }

        table{
            width:100%;
            border-collapse:collapse;
        }

        td{
            padding:4px;
        }

        .signature{

            margin-top:70px;

            width:100%;
        }

        .signature td{

            width:50%;

            text-align:center;
        }

        .stamp{

            width:120px;

            position:absolute;

            margin-top:-10px;

            margin-left:-60px;
        }

        .sign{

            width:130px;
        }

    </style>

</head>

<body>

<h2>

{{ strtoupper($letter->letterType->name) }}

</h2>

<p align="center">

Nomor :
{{ $letter->letter_number ?? '-' }}

</p>

<br>

<table>

<tr>

<td width="180">Nama</td>

<td width="20">:</td>

<td>{{ $letter->applicant_name }}</td>

</tr>

<tr>

<td>NIK</td>

<td>:</td>

<td>{{ $letter->applicant_nik }}</td>

</tr>

<tr>

<td>Alamat</td>

<td>:</td>

<td>{{ $letter->applicant_address }}</td>

</tr>

<tr>

<td>Keperluan</td>

<td>:</td>

<td>{{ $letter->purpose }}</td>

</tr>

</table>

<br><br>

<p style="text-align:justify">

Surat ini diterbitkan oleh Pemerintah Desa berdasarkan data administrasi
kependudukan yang berlaku dan dapat dipergunakan sebagaimana mestinya.

</p>

<table class="signature">

<tr>

<td></td>

<td>

{{ now()->translatedFormat('d F Y') }}

<br><br>

Kepala Desa

<br><br><br>

@if($kades->stamp_img)

<img
class="stamp"
src="{{ public_path('storage/'.$kades->stamp_img) }}">

@endif

@if($kades->signature_img)

<img
class="sign"
src="{{ public_path('storage/'.$kades->signature_img) }}">

@endif

<br>

<b>

{{ $kades->citizen->name }}

</b>

</td>

</tr>

</table>

</body>

</html>