#pragma once

namespace Sys {

    /**
     * @brief Run boot sequence checks.
     * Checks crash counters and determines if we should enter Safe Mode.
     * @return True if boot continues to Normal Mode, False if Safe Mode entered.
     */
    bool checkBoot();

}
