package runners;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class KarateTestRunner {

    // ✅ API tests — parallel
    @Test
    void testApiParallel() {
        Results results = Runner.path("classpath:features").parallel(5);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }


}