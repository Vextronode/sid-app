<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">

    <style>

        body{
            font-family: DejaVu Sans, sans-serif;
            font-size:14px;
            line-height:1.6;
        }

        img{
            object-fit:contain;
        }

    </style>

</head>
<body>

{!! $template !!}

<div style="margin-top:50px;text-align:right;">

    <p>
        {{ $letter->village->name }},
        {{ now()->translatedFormat('d F Y') }}
    </p>

    <p>Kepala Desa</p>

    <br>

    @if($kades->signature_img)
        <img
            src="{{ public_path('storage/'.$kades->signature_img) }}"
            width="140">
    @endif

    <br>

    @if($kades->stamp_img)
        <img
            src="{{ public_path('storage/'.$kades->stamp_img) }}"
            width="110">
    @endif

    <br><br>

    <strong>
        {{ $kades->citizen->full_name }}
    </strong>

</div>

</body>
</html>