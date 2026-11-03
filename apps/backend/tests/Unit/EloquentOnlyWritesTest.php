<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\File;
use PhpToken;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Semua penulisan ke citizens, families, family_socioeconomics, letters,
 * dan letter_signatures harus lewat model Eloquent. Mass update/delete
 * (`Citizen::query()->update(...)`, `$family->members()->update(...)`,
 * `DB::table('letters')->delete()`) melewati event model, sehingga jejak
 * audit observer (PopulationAuditObserver) tidak tercatat.
 */
class EloquentOnlyWritesTest extends TestCase
{
    private const MODELS = ['Citizen', 'Family', 'FamilySocioeconomic', 'Letter', 'LetterSignature'];

    private const TABLES = ['citizens', 'families', 'family_socioeconomics', 'letters', 'letter_signatures'];

    /** Relasi yang mengembalikan query model di atas. */
    private const RELATIONS = ['members', 'socioeconomics', 'signatures', 'citizens', 'letters', 'families'];

    private const MASS_WRITES = [
        'update', 'delete', 'forceDelete', 'increment', 'decrement', 'incrementEach', 'decrementEach',
        'upsert', 'insert', 'insertOrIgnore', 'insertGetId', 'insertUsing', 'updateOrInsert', 'updateFrom', 'truncate',
    ];

    /** Pemanggilan yang menghasilkan model; penulisan setelahnya berjalan per model. */
    private const MATERIALIZERS = [
        'first', 'firstOrFail', 'sole', 'find', 'findOrFail', 'get', 'each', 'lazy', 'lazyById', 'cursor',
        'chunk', 'chunkById', 'firstWhere', 'firstOrNew', 'firstOrCreate', 'updateOrCreate', 'create',
    ];

    public function test_app_code_writes_audited_tables_only_through_models(): void
    {
        $violations = [];

        foreach (File::allFiles(app_path()) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }

            foreach ($this->statements($file->getContents()) as [$line, $statement]) {
                if ($this->isMassWrite($statement)) {
                    $violations[] = $file->getRelativePathname().':'.$line;
                }
            }
        }

        $this->assertSame([], $violations, 'Mass update/delete melewati observer audit; tulis lewat model satu per satu.');
    }

    #[DataProvider('statementProvider')]
    public function test_detector_tells_mass_writes_from_per_model_writes(string $statement, bool $isMassWrite): void
    {
        $this->assertSame($isMassWrite, $this->isMassWrite($statement));
    }

    public static function statementProvider(): array
    {
        return [
            'mass update model' => ["Citizen::query()->where('family_id', \$id)->update(['is_active' => false])", true],
            'mass delete model' => ["LetterSignature::where('letter_id', \$id)->delete()", true],
            'mass update relasi' => ["\$family->members()->update(['is_active' => false])", true],
            'query builder tabel' => ["DB::table('letters')->where('id', \$id)->delete()", true],
            'increment massal' => ["Letter::query()->whereKey(\$id)->increment('views')", true],
            'per model setelah first' => ["Citizen::query()->whereKey(\$id)->firstOrFail()->update(['name' => 'A'])", false],
            'per model lewat each' => ["LetterSignature::query()->where('x', 1)->get()->each(fn (\$r) => \$r->update(['status' => 'expired']))", false],
            'instance model' => ["\$citizen->update(['name' => 'A'])", false],
            'model lain' => ["User::query()->where('role', 'rt')->update(['is_active' => false])", false],
            'enum bernama mirip' => ["\$letter->update(['status' => LetterStatus::Approved])", false],
        ];
    }

    private function isMassWrite(string $statement): bool
    {
        $models = implode('|', self::MODELS);
        $tables = implode('|', self::TABLES);
        $relations = implode('|', self::RELATIONS);

        if (! preg_match("/\\b(?:{$models})::|DB::table\\(\\s*['\"](?:{$tables})['\"]|->(?:{$relations})\\(\\)/", $statement, $source, PREG_OFFSET_CAPTURE)) {
            return false;
        }

        $chain = substr($statement, $source[0][1]);

        if (! preg_match('/->(?:'.implode('|', self::MASS_WRITES).')\(/', $chain, $write, PREG_OFFSET_CAPTURE)) {
            return false;
        }

        $materialized = preg_match('/->(?:'.implode('|', self::MATERIALIZERS).')\(/', $chain, $materializer, PREG_OFFSET_CAPTURE);

        return ! $materialized || $materializer[0][1] > $write[0][1];
    }

    /**
     * Pernyataan PHP (dipisah `;`) tanpa komentar, beserta baris awalnya.
     *
     * @return list<array{0: int, 1: string}>
     */
    private function statements(string $code): array
    {
        $statements = [];
        $current = '';
        $line = null;

        foreach (PhpToken::tokenize($code) as $token) {
            if ($token->is([T_COMMENT, T_DOC_COMMENT, T_OPEN_TAG])) {
                continue;
            }

            if ($token->text === ';' || $token->text === '{' || $token->text === '}') {
                if (trim($current) !== '') {
                    $statements[] = [$line, preg_replace('/\s+/', '', $current)];
                }

                $current = '';
                $line = null;

                continue;
            }

            $line ??= $token->line;
            $current .= $token->text;
        }

        return $statements;
    }
}
