<?php

namespace Tests\Unit;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Services\Auth\UsernameGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsernameGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_single_word_name_gets_four_digits(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [2518]);

        $this->assertSame('supratman.2518', $generator->generate('Supratman'));
    }

    public function test_two_word_name_uses_first_and_last_name_with_four_digits_even_when_free(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [4821]);

        $this->assertSame('siti.aminah.4821', $generator->generate('Siti Aminah'));
    }

    public function test_three_or_more_words_use_first_and_last_word(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [7305, 1002]);

        $this->assertSame('ahmad.rahman.7305', $generator->generate('Ahmad Fauzi Rahman'));
        $this->assertSame('muhammad.hidayat.1002', $generator->generate('Muhammad Nur Abdul Hidayat'));
    }

    public function test_ignores_leading_and_trailing_titles(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [3001, 3002, 1274]);

        $this->assertSame('ahmad.fauzi.3001', $generator->generate('H. Hj. Ahmad Fauzi'));
        $this->assertSame('budi.santoso.3002', $generator->generate('Dr. Budi Santoso, S.Pd., M.Si'));
        // Setelah gelar dibuang tinggal satu kata: namadepan.4digit.
        $this->assertSame('ahmad.1274', $generator->generate('H. Ahmad, S.Ag'));
    }

    public function test_falls_back_for_empty_or_punctuation_name(): void
    {
        $emptyName = new SequenceUsernameGenerator(new UserRepository, [4321]);
        $punctuation = new SequenceUsernameGenerator(new UserRepository, [9876]);

        $this->assertSame('warga.4321', $emptyName->generate(''));
        $this->assertSame('warga.9876', $punctuation->generate('!!!'));
    }

    public function test_ascii_normalizes_and_removes_non_alphanumeric_characters(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [1111, 2222]);

        $this->assertSame('jose.1111', $generator->generate('José!'));
        $this->assertSame('jose.oneil.2222', $generator->generate("José O'Neil"));
    }

    public function test_same_full_name_retries_the_four_digits(): void
    {
        User::factory()->create(['username' => 'siti.aminah.2727']);
        $generator = new SequenceUsernameGenerator(new UserRepository, [2727, 4545]);

        $this->assertSame('siti.aminah.4545', $generator->generate('Siti Aminah Putri Aminah'));
    }

    public function test_retries_colliding_four_digit_username(): void
    {
        User::factory()->create(['username' => 'siti.1234']);
        $generator = new SequenceUsernameGenerator(new UserRepository, [1234, 5678]);

        $this->assertSame('siti.5678', $generator->generate('Siti'));
    }

    public function test_falls_back_to_five_digits_after_ten_four_digit_collisions(): void
    {
        $numbers = range(1000, 1009);
        foreach ($numbers as $number) {
            User::factory()->create(['username' => "aminah.{$number}"]);
        }
        $generator = new SequenceUsernameGenerator(new UserRepository, [...$numbers, 12345]);

        $this->assertSame('aminah.12345', $generator->generate('Aminah'));
    }

    public function test_generated_username_fits_the_thirty_character_column(): void
    {
        $single = new SequenceUsernameGenerator(new UserRepository, [12345]);
        $this->assertSame('abcdefghijklmnopqrst.12345', $single->generate('abcdefghijklmnopqrstuvwxyz'));

        $long = new SequenceUsernameGenerator(new UserRepository, [12345]);
        $username = $long->generate('abcdefghijklmnopq opqrstuvwxyzabcdef');

        $this->assertSame('abcdefghijk.opqrstuvwxy.12345', $username);
        $this->assertLessThanOrEqual(30, strlen($username));
    }
}

class SequenceUsernameGenerator extends UsernameGenerator
{
    /**
     * @param  array<int, int>  $numbers
     */
    public function __construct(UserRepository $repository, private array $numbers)
    {
        parent::__construct($repository);
    }

    protected function randomNumber(int $digits): int
    {
        return array_shift($this->numbers);
    }
}
