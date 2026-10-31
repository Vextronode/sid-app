<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kategori surat diganti properti langsung di tipe surat: satu tipe surat
 * boleh menerbitkan surat SEKALIGUS memicu aksi data (mis. kelahiran),
 * sehingga kategori "salah satu" tidak lagi cukup. Definisi isian form,
 * kolom data, slot tanda tangan, dan template dokumen pendukung ikut
 * disimpan di tipe surat (diset developer lewat seeder).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letter_types', function (Blueprint $table) {
            $table->boolean('produces_letter')->default(true);
            $table->string('data_action', 30)->default('none');
            $table->json('form_fields')->nullable();
            $table->json('data_fields')->nullable();
            $table->text('supporting_template')->nullable();
        });

        Schema::table('letter_types', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
        });

        // Flow tanpa step membuat surat menggantung; yang tidak pernah
        // dipakai dibuang, yang terlanjur dipakai dibiarkan sebagai riwayat.
        DB::table('approval_flows')
            ->whereNotIn('id', DB::table('flow_steps')->select('flow_id'))
            ->whereNotIn('id', DB::table('letter_types')->select('flow_id'))
            ->whereNotIn('id', DB::table('letters')->select('flow_id'))
            ->delete();

        Schema::table('approval_flows', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
        });

        Schema::dropIfExists('letter_categories');
    }

    public function down(): void
    {
        Schema::create('letter_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->string('handler_class', 150);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $categoryId = DB::table('letter_categories')->insertGetId([
            'code' => 'approval_normal',
            'name' => 'Approval Normal',
            'handler_class' => 'App\Services\Letters\ApprovalNormalHandler',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach (['approval_flows', 'letter_types'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('category_id')->nullable()->constrained('letter_categories');
            });
            DB::table($tableName)->update(['category_id' => $categoryId]);
        }

        Schema::table('letter_types', function (Blueprint $table) {
            $table->dropColumn([
                'produces_letter',
                'data_action',
                'form_fields',
                'data_fields',
                'supporting_template',
            ]);
        });
    }
};
