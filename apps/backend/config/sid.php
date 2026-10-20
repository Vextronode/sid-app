<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Nama aplikasi desa
    |--------------------------------------------------------------------------
    | Nama produk yang tampil ke pengguna, termasuk label peran staf yang
    | memegang aplikasi ("Staf {nama}", kode peran: staf_sid). Bisa diganti
    | lewat env tanpa mengubah kode bila desa memakai nama lain. Terpisah
    | dari APP_NAME, yang bawaannya "Laravel" dan dipakai untuk mail.
    */

    'app_name' => env('SID_APP_NAME', 'SIDUTama'),

];
