<?php

class CycleService
{

    /**
     * Genera predicciones de ciclo basadas en la última menstruación
     */
    public static function predictNextCycles($lastPeriodDate, $cycleLength, $daysToGenerate = 90)
    {

        $startDate = new DateTime($lastPeriodDate);
        $predictions = [];

        // ✅ FALLBACK: Un ciclo humano normal dura más de 20 días.
        // Si el usuario accidentalmente pone "5" creyendo que habla de los días de sangrado, se romperá la matemática.
        if ($cycleLength < 15) {
            $cycleLength = 28;
        }

        for ($i = 0; $i < $daysToGenerate; $i++) {

            $date = clone $startDate;
            $date->modify("+$i days");

            // ✅ CLAVE: día del ciclo correcto
            $cycleDay = ($i % $cycleLength) + 1;

            $type = self::getDayType($cycleDay, $cycleLength);

            $predictions[] = [
                'date' => $date->format('Y-m-d'),
                'cycle_day' => $cycleDay,
                'type' => $type
            ];
        }

        return $predictions;
    }

    /**
     * Determina el tipo de día
     */
    private static function getDayType($cycleDay, $cycleLength)
    {

        $ovulationDay = $cycleLength - 14;
        $fertileStart = $ovulationDay - 5;
        $fertileEnd = $ovulationDay;

        // 🩸 Menstruación (puedes ajustar a 5 días)
        if ($cycleDay >= 1 && $cycleDay <= 5) {
            return 'period';
        }

        // 🔥 Ovulación (PRIMERO, para que no quede dentro de fértil)
        if ($cycleDay == $ovulationDay) {
            return 'ovulation';
        }

        // 🌱 Ventana fértil
        if ($cycleDay >= $fertileStart && $cycleDay <= $fertileEnd) {
            return 'fertile';
        }

        // 🌙 Normal
        return 'normal';
    }
}