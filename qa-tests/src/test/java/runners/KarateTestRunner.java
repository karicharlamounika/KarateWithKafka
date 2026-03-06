package runners;

import com.intuit.karate.Results;
import com.intuit.karate.Runner;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class KarateTestRunner {

    // ✅ API tests — parallel
    @Test
    void testApiParallel() {
        Results results = Runner.path("classpath:features")
            .tags("~@integration")
            .parallel(4);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }

    // ✅ Integration tests — sequential until Kafka fixed
    @Test
    void testIntegration() {
        Results results = Runner.path("classpath:features")
            .tags("@integration")
            .parallel(1);
        assertEquals(0, results.getFailCount(), results.getErrorMessages());
    }
}