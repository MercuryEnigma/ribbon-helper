require "capybara/minitest"

class CapybaraTestCase < Minitest::Test
  include Capybara::DSL
  include Capybara::Minitest::Assertions

  Capybara.current_driver = :selenium_headless

  def initialize(super_arg)
    super(super_arg)
    visit("http://localhost:4000") # hoping that port 4000 is pretty universal
  end


  def test_loads_em
    find(:xpath, './/label[@for="game3"]').click
    assert_equal("Abra-1 Mimic vs. Abra-1: 0-0 (0 - 0%) -- nice move", find("#mainResult").text)
  end

  def test_loads_pthgss
    find(:xpath, './/label[@for="game4"]').click
    assert_equal("252 SpA Abomasnow-1 Giga Drain vs. 252 HP / 0+ SpD Abomasnow-1: 21-26 (10.7 - 13.2%); recovers 10-13 (5.1 - 6.6%) -- possible 8HKO", find("#mainResult").text)
  end

  def test_loads_bw
    find(:xpath, './/label[@for="game5"]').click
    assert_equal("0- SpA Abomasnow-1 Frost Breath vs. 168 HP / 168 SpD Abomasnow-1 on a critical hit: 37-45 (19.9 - 24.2%) -- possible 6HKO after Leftovers recovery", find("#mainResult").text)
  end

  def test_loads_oras
    find(:xpath, './/label[@for="game6"]').click
    assert_equal("0- SpA Abomasnow-1 Frost Breath vs. 168 HP / 168 SpD Abomasnow-1 on a critical hit: 42-49 (22.6 - 26.3%) -- possible 5HKO after Leftovers recovery", find("#mainResult").text)
  end

  def test_loads_usum
    find(:xpath, './/label[@for="game7"]').click
    assert_equal("0- SpA Abomasnow-1 Frost Breath vs. 168 HP / 168 SpD Abomasnow-1 on a critical hit: 42-49 (22.6 - 26.3%) -- possible 5HKO after Leftovers recovery", find("#mainResult").text)
  end

  def test_loads_swsh
    find(:xpath, './/label[@for="game8"]').click
    assert_equal("252+ Atk Abomasnow-RS Ice Punch vs. 252 HP / 0 Def Abomasnow-RS: 73-87 (38.6 - 46%) -- guaranteed 3HKO", find("#mainResult").text)
  end

  def test_loads_bdsp
    find(:xpath, './/label[@for="game80"]').click
    assert_equal("204+ SpA Abomasnow-1 Blizzard (spread) vs. 204 HP / 0 SpD Abomasnow-1: 70-84 (36.6 - 44%) -- guaranteed 3HKO", find("#mainResult").text)
  end

  def test_loads_sv
    find(:xpath, './/label[@for="game9"]').click
    assert_equal("Abomasnow (No Move) vs. Abomasnow: 0-0 (0 - 0%) -- nice move", find("#mainResult").text)
  end

end