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

    public function test_removes_repeated_leading_titles(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [1274]);

        $this->assertSame('ahmad.1274', $generator->generate('H. Hj. Ahmad Fauzi'));
    }

    public function test_generates_for_single_word_name_and_falls_back_for_empty_or_punctuation_name(): void
    {
        $singleWord = new SequenceUsernameGenerator(new UserRepository, [2518]);
        $emptyName = new SequenceUsernameGenerator(new UserRepository, [4321]);
        $punctuation = new SequenceUsernameGenerator(new UserRepository, [9876]);

        $this->assertSame('supratman.2518', $singleWord->generate('Supratman'));
        $this->assertSame('warga.4321', $emptyName->generate(''));
        $this->assertSame('warga.9876', $punctuation->generate('!!!'));
    }

    public function test_ascii_normalizes_and_removes_non_alphanumeric_characters(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [1111]);

        $this->assertSame('jose.1111', $generator->generate('José!'));
    }

    public function test_retries_colliding_four_digit_username(): void
    {
        User::factory()->create(['username' => 'siti.1234']);
        $generator = new SequenceUsernameGenerator(new UserRepository, [1234, 5678]);

        $this->assertSame('siti.5678', $generator->generate('Siti Aminah'));
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

    public function test_generated_username_is_at_most_twenty_six_characters(): void
    {
        $generator = new SequenceUsernameGenerator(new UserRepository, [12345]);

        $username = $generator->generate('abcdefghijklmnopqrstuvwx yz');

        $this->assertSame(26, strlen($username));
        $this->assertSame('abcdefghijklmnopqrst.12345', $username);
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
