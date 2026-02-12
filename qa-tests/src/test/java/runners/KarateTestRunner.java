package runners;

import com.intuit.karate.junit5.Karate;

class KarateTestRunner {

  @Karate.Test
  Karate runAll() {
    return Karate.run("classpath:features");
  }
}
