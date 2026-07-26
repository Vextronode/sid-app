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

        .digital-box{
            margin-top:50px;
            text-align:right;
        }

        .digital-sign{
            border:1px solid #666;
            display:inline-block;
            padding:15px;
            margin-top:10px;
            text-align:center;
            width:220px;
        }

        img{
            object-fit:contain;
        }

    </style>

</head>
<body>

{!! $template !!}

<div class="digital-box">

    <p>
        {{ $letter->village->name }},
        {{ now()->translatedFormat('d F Y') }}
    </p>

    <p>Kepala Desa</p>

    <div>

        @if($kades->signature_img)

            <img
                src="{{ public_path('storage/'.$kades->signature_img) }}"
                width="120">

        @endif

        <br>

        <strong>
            {{ $kades->citizen->full_name }}
        </strong>

    </div>

</div>

</body>
</html>