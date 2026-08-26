/**
 * Chinese marques: BYD, Chery, Changan, Geely, GWM/Haval, JAC, Dongfeng, MG,
 * Foton, BAIC, Jetour, Wuling.
 *
 * These are the brands SinoPart sources for most directly, so coverage here is
 * deliberately generous, including the commercial and light-truck lines that a
 * consumer-focused catalog would leave out.
 *
 * Chinese model cycles move faster than the Japanese or German ones and vary
 * by export market, so generation boundaries here are the closest sensible
 * approximation rather than a homologation record. They are meant to be edited:
 * change a `g(...)` line and re-run the seed, it is idempotent.
 */
import { b, e, g, s } from '../types';

export const CHINESE = [
  b(
    'BYD',
    'Chinese manufacturer, now predominantly electric and plug-in hybrid. Blade-battery models dominate the current range.',
    s(
      'F3',
      g(
        2010,
        2020,
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
        e(1.6, 'Petrol', 'Manual'),
      ),
    ),
    s(
      'Qin',
      g(
        2013,
        2020,
        e(1.5, 'Plug-in Hybrid', 'DCT'),
        e(2.0, 'Plug-in Hybrid', 'DCT'),
      ),
      g(
        2021,
        null,
        e(1.5, 'Plug-in Hybrid', 'DCT'),
        e(57.6, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Han',
      g(
        2020,
        null,
        e(2.0, 'Plug-in Hybrid', 'DCT'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
        e(85.4, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Tang',
      g(2015, 2017, e(2.0, 'Plug-in Hybrid', 'DCT')),
      g(
        2018,
        null,
        e(2.0, 'Plug-in Hybrid', 'DCT'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
        e(86.4, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Song',
      g(
        2016,
        2020,
        e(1.5, 'Petrol', 'DCT'),
        e(2.0, 'Petrol', 'DCT'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
      g(
        2021,
        null,
        e(1.5, 'Plug-in Hybrid', 'DCT'),
        e(71.7, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Yuan',
      g(
        2016,
        2021,
        e(1.5, 'Petrol', 'Manual', 'DCT'),
        e(43.2, 'Electric', 'Single-speed'),
      ),
      g(
        2022,
        null,
        e(49.9, 'Electric', 'Single-speed'),
        e(60.5, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Atto 3',
      g(
        2022,
        null,
        e(49.9, 'Electric', 'Single-speed'),
        e(60.5, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Dolphin',
      g(
        2021,
        null,
        e(44.9, 'Electric', 'Single-speed'),
        e(60.5, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Seagull',
      g(
        2023,
        null,
        e(30.1, 'Electric', 'Single-speed'),
        e(38.9, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Seal',
      g(
        2022,
        null,
        e(61.4, 'Electric', 'Single-speed'),
        e(82.5, 'Electric', 'Single-speed'),
      ),
    ),
    s('Sealion 6', g(2023, null, e(1.5, 'Plug-in Hybrid', 'DCT'))),
    s(
      'Sealion 7',
      g(
        2024,
        null,
        e(82.5, 'Electric', 'Single-speed'),
        e(91.3, 'Electric', 'Single-speed'),
      ),
    ),
    s('Destroyer 05', g(2022, null, e(1.5, 'Plug-in Hybrid', 'DCT'))),
    s('Frigate 07', g(2022, null, e(1.5, 'Plug-in Hybrid', 'DCT'))),
    s(
      'e6',
      g(
        2010,
        null,
        e(60.0, 'Electric', 'Single-speed'),
        e(71.7, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'e2',
      g(
        2019,
        null,
        e(35.2, 'Electric', 'Single-speed'),
        e(43.2, 'Electric', 'Single-speed'),
      ),
    ),
    s('Shark', g(2024, null, e(1.5, 'Plug-in Hybrid', 'Automatic'))),
  ),

  b(
    'Chery',
    'Chinese manufacturer with a long-established export business; the Tiggo SUV line is its highest-volume family.',
    s(
      'QQ',
      g(
        2010,
        2019,
        e(0.8, 'Petrol', 'Manual'),
        e(1.0, 'Petrol', 'Manual', 'AMT'),
        e(1.1, 'Petrol', 'Manual'),
      ),
    ),
    s('Tiggo 2', g(2017, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s(
      'Tiggo 3',
      g(
        2014,
        2021,
        e(1.6, 'Petrol', 'Manual', 'CVT'),
        e(2.0, 'Petrol', 'Manual', 'CVT'),
      ),
    ),
    s(
      'Tiggo 4',
      g(2018, null, e(1.5, 'Petrol', 'Manual', 'CVT'), e(1.6, 'Petrol', 'DCT')),
    ),
    s(
      'Tiggo 5',
      g(
        2014,
        2019,
        e(1.5, 'Petrol', 'Manual', 'CVT'),
        e(2.0, 'Petrol', 'Manual', 'CVT'),
      ),
      g(2020, null, e(1.5, 'Petrol', 'CVT')),
    ),
    s(
      'Tiggo 7',
      g(2017, 2019, e(1.5, 'Petrol', 'Manual', 'CVT'), e(2.0, 'Petrol', 'CVT')),
      g(2020, null, e(1.5, 'Petrol', 'CVT'), e(1.6, 'Petrol', 'DCT')),
    ),
    s(
      'Tiggo 8',
      g(
        2019,
        null,
        e(1.5, 'Petrol', 'CVT'),
        e(1.6, 'Petrol', 'DCT'),
        e(2.0, 'Petrol', 'DCT'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
    ),
    s(
      'Tiggo 9',
      g(
        2023,
        null,
        e(2.0, 'Petrol', 'Automatic'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
    ),
    s('Arrizo 5', g(2016, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s(
      'Arrizo 6',
      g(2019, null, e(1.5, 'Petrol', 'CVT'), e(1.6, 'Petrol', 'DCT')),
    ),
    s(
      'Fulwin',
      g(2010, 2016, e(1.5, 'Petrol', 'Manual'), e(1.6, 'Petrol', 'Manual')),
    ),
    s(
      'E5',
      g(
        2011,
        2017,
        e(1.5, 'Petrol', 'Manual'),
        e(1.8, 'Petrol', 'Manual', 'CVT'),
      ),
    ),
    s(
      'Omoda 5',
      g(
        2022,
        null,
        e(1.5, 'Petrol', 'CVT'),
        e(1.6, 'Petrol', 'DCT'),
        e(61.0, 'Electric', 'Single-speed'),
      ),
    ),
  ),

  b(
    'Changan',
    'Chinese state-owned manufacturer; the CS crossover series and the Hunter pickup lead its export range.',
    s('CS15', g(2016, null, e(1.5, 'Petrol', 'Manual', 'DCT'))),
    s(
      'CS35',
      g(2012, 2017, e(1.6, 'Petrol', 'Manual', 'Automatic')),
      g(
        2018,
        null,
        e(1.4, 'Petrol', 'DCT'),
        e(1.6, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s(
      'CS55',
      g(
        2017,
        null,
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
    ),
    s(
      'CS75',
      g(
        2013,
        2019,
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
        e(1.8, 'Petrol', 'Automatic'),
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
        e(1.8, 'Diesel', 'Manual'),
      ),
      g(
        2020,
        null,
        e(1.5, 'Petrol', 'Automatic'),
        e(2.0, 'Petrol', 'Automatic'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
    ),
    s('CS85', g(2019, null, e(2.0, 'Petrol', 'Automatic'))),
    s('CS95', g(2017, null, e(2.0, 'Petrol', 'Automatic'))),
    s(
      'Eado',
      g(
        2012,
        null,
        e(1.6, 'Petrol', 'Manual', 'Automatic'),
        e(1.4, 'Petrol', 'DCT'),
      ),
    ),
    s(
      'Alsvin',
      g(2018, null, e(1.4, 'Petrol', 'Manual', 'DCT'), e(1.5, 'Petrol', 'DCT')),
    ),
    s(
      'Raeton',
      g(
        2013,
        2020,
        e(1.8, 'Petrol', 'Automatic'),
        e(2.0, 'Petrol', 'Automatic'),
      ),
    ),
    s('UNI-T', g(2020, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s(
      'UNI-K',
      g(
        2021,
        null,
        e(2.0, 'Petrol', 'Automatic'),
        e(2.0, 'Plug-in Hybrid', 'Automatic'),
      ),
    ),
    s('UNI-V', g(2022, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s(
      'Hunter',
      g(
        2019,
        null,
        e(2.0, 'Diesel', 'Manual', 'Automatic'),
        e(2.5, 'Diesel', 'Manual'),
      ),
    ),
    s(
      'Star Truck',
      g(2010, null, e(1.2, 'Petrol', 'Manual'), e(1.5, 'Petrol', 'Manual')),
    ),
  ),

  b(
    'Geely',
    'Chinese manufacturer and owner of Volvo and Lotus; recent models share platform hardware with Volvo, which widens parts cross-referencing.',
    s(
      'Emgrand',
      g(
        2010,
        2017,
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
        e(1.8, 'Petrol', 'Manual', 'Automatic'),
      ),
      g(
        2018,
        null,
        e(1.4, 'Petrol', 'Manual', 'CVT'),
        e(1.5, 'Petrol', 'Manual', 'CVT'),
      ),
    ),
    s('GC6', g(2014, 2019, e(1.5, 'Petrol', 'Manual', 'Automatic'))),
    s('Coolray', g(2019, null, e(1.5, 'Petrol', 'DCT'))),
    s(
      'Boyue',
      g(
        2016,
        null,
        e(1.5, 'Petrol', 'Manual', 'DCT'),
        e(1.8, 'Petrol', 'Automatic'),
        e(2.0, 'Petrol', 'Automatic'),
      ),
    ),
    s('Azkarra', g(2020, null, e(1.5, 'Hybrid', 'DCT'))),
    s('Okavango', g(2021, null, e(1.5, 'Hybrid', 'DCT'))),
    s('Tugella', g(2020, null, e(2.0, 'Petrol', 'Automatic'))),
    s(
      'Atlas',
      g(
        2017,
        null,
        e(1.8, 'Petrol', 'Automatic'),
        e(2.0, 'Petrol', 'Automatic'),
        e(1.5, 'Hybrid', 'DCT'),
      ),
    ),
    s(
      'Starray',
      g(
        2023,
        null,
        e(1.5, 'Plug-in Hybrid', 'DCT'),
        e(2.0, 'Petrol', 'Automatic'),
      ),
    ),
    s('Monjaro', g(2022, null, e(2.0, 'Petrol', 'Automatic'))),
    s(
      'Preface',
      g(2020, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'Automatic')),
    ),
    s('Icon', g(2020, null, e(1.5, 'Petrol', 'DCT'))),
    s(
      'Panda Mini',
      g(
        2022,
        null,
        e(9.6, 'Electric', 'Single-speed'),
        e(17.0, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Geometry C',
      g(
        2020,
        null,
        e(53.0, 'Electric', 'Single-speed'),
        e(70.0, 'Electric', 'Single-speed'),
      ),
    ),
  ),

  b(
    'GWM',
    'Great Wall Motor. Trades as GWM, Haval, Poer and Ora depending on the line; the Wingle and Poer pickups are its long-running commercial models.',
    s('Haval H2', g(2014, 2021, e(1.5, 'Petrol', 'Manual', 'DCT'))),
    s(
      'Haval H6',
      g(
        2011,
        2016,
        e(1.5, 'Petrol', 'Manual', 'DCT'),
        e(2.0, 'Petrol', 'Manual'),
        e(2.0, 'Diesel', 'Manual'),
      ),
      g(2017, 2020, e(1.5, 'Petrol', 'Manual', 'DCT'), e(2.0, 'Petrol', 'DCT')),
      g(
        2021,
        null,
        e(1.5, 'Petrol', 'DCT'),
        e(2.0, 'Petrol', 'DCT'),
        e(1.5, 'Hybrid', 'DCT'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
    ),
    s(
      'Haval H9',
      g(
        2015,
        null,
        e(2.0, 'Petrol', 'Automatic'),
        e(2.0, 'Diesel', 'Automatic'),
      ),
    ),
    s(
      'Jolion',
      g(2021, null, e(1.5, 'Petrol', 'Manual', 'DCT'), e(1.5, 'Hybrid', 'DCT')),
    ),
    s('Dargo', g(2021, null, e(2.0, 'Petrol', 'Automatic'))),
    s(
      'Poer',
      g(
        2019,
        null,
        e(2.0, 'Diesel', 'Manual', 'Automatic'),
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s(
      'Wingle 5',
      g(2010, null, e(2.0, 'Diesel', 'Manual'), e(2.4, 'Petrol', 'Manual')),
    ),
    s(
      'Wingle 7',
      g(2018, null, e(2.0, 'Diesel', 'Manual'), e(2.0, 'Petrol', 'Manual')),
    ),
    s(
      'Steed',
      g(2010, 2020, e(2.0, 'Diesel', 'Manual'), e(2.4, 'Petrol', 'Manual')),
    ),
    s(
      'Tank 300',
      g(
        2021,
        null,
        e(2.0, 'Petrol', 'Automatic'),
        e(2.0, 'Hybrid', 'Automatic'),
      ),
    ),
    s(
      'Tank 500',
      g(
        2022,
        null,
        e(3.0, 'Petrol', 'Automatic'),
        e(2.0, 'Hybrid', 'Automatic'),
      ),
    ),
    s(
      'Ora Good Cat',
      g(
        2021,
        null,
        e(47.8, 'Electric', 'Single-speed'),
        e(63.1, 'Electric', 'Single-speed'),
      ),
    ),
  ),

  b(
    'JAC',
    'Jianghuai Automobile. Broad line of light trucks and SUVs; heavily represented in African commercial fleets.',
    s('S2', g(2015, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s(
      'S3',
      g(
        2014,
        null,
        e(1.5, 'Petrol', 'Manual', 'CVT'),
        e(1.6, 'Petrol', 'Manual'),
      ),
    ),
    s('S4', g(2018, null, e(1.5, 'Petrol', 'CVT'), e(1.6, 'Petrol', 'DCT'))),
    s(
      'S5',
      g(
        2013,
        null,
        e(1.5, 'Petrol', 'Manual', 'DCT'),
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s('S7', g(2017, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s(
      'J3',
      g(
        2010,
        2018,
        e(1.3, 'Petrol', 'Manual'),
        e(1.5, 'Petrol', 'Manual', 'CVT'),
      ),
    ),
    s('J4', g(2018, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s(
      'J5',
      g(
        2010,
        2017,
        e(1.5, 'Petrol', 'Manual'),
        e(1.8, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s(
      'T6',
      g(2015, null, e(2.0, 'Petrol', 'Manual'), e(2.0, 'Diesel', 'Manual')),
    ),
    s(
      'T8',
      g(
        2018,
        null,
        e(2.0, 'Diesel', 'Manual', 'Automatic'),
        e(2.0, 'Petrol', 'Manual'),
      ),
    ),
    s('X200', g(2010, null, e(2.8, 'Diesel', 'Manual'))),
    s(
      'Sunray',
      g(2012, null, e(2.0, 'Diesel', 'Manual'), e(2.8, 'Diesel', 'Manual')),
    ),
    s(
      'Refine',
      g(
        2010,
        null,
        e(1.9, 'Diesel', 'Manual'),
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s(
      'N-Series',
      g(2012, null, e(2.8, 'Diesel', 'Manual'), e(3.8, 'Diesel', 'Manual')),
    ),
    s('iEV7S', g(2017, null, e(39.0, 'Electric', 'Single-speed'))),
  ),

  b(
    'Dongfeng',
    'Chinese state-owned manufacturer; sells light commercial vehicles, the Rich pickup range and the Glory/Fengon SUV lines.',
    s(
      'Rich 6',
      g(
        2018,
        null,
        e(2.0, 'Diesel', 'Manual', 'Automatic'),
        e(2.0, 'Petrol', 'Manual'),
      ),
    ),
    s(
      'Rich',
      g(2010, 2018, e(2.5, 'Diesel', 'Manual'), e(2.4, 'Petrol', 'Manual')),
    ),
    s(
      'AX7',
      g(
        2014,
        null,
        e(1.6, 'Petrol', 'Manual', 'DCT'),
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s('AX4', g(2017, null, e(1.6, 'Petrol', 'Manual', 'CVT'))),
    s(
      'Glory 580',
      g(
        2016,
        null,
        e(1.5, 'Petrol', 'Manual', 'CVT'),
        e(1.8, 'Petrol', 'Manual', 'CVT'),
      ),
    ),
    s('Fengon 500', g(2018, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s(
      'Joyear',
      g(
        2012,
        null,
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
        e(1.6, 'Petrol', 'Manual'),
      ),
    ),
    s(
      'Sokon C31',
      g(2014, null, e(1.2, 'Petrol', 'Manual'), e(1.5, 'Petrol', 'Manual')),
    ),
    s(
      'Captain',
      g(2010, null, e(2.5, 'Diesel', 'Manual'), e(3.2, 'Diesel', 'Manual')),
    ),
    s(
      'Nammi',
      g(
        2023,
        null,
        e(31.4, 'Electric', 'Single-speed'),
        e(42.3, 'Electric', 'Single-speed'),
      ),
    ),
  ),

  b(
    'MG',
    'British marque owned by SAIC and built in China; the ZS and HS crossovers carry most of the current export volume.',
    s(
      'MG3',
      g(
        2011,
        null,
        e(1.3, 'Petrol', 'Manual'),
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
      ),
    ),
    s(
      'MG5',
      g(2012, 2019, e(1.5, 'Petrol', 'Manual', 'Automatic')),
      g(
        2020,
        null,
        e(1.5, 'Petrol', 'CVT'),
        e(50.3, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'MG6',
      g(2010, 2016, e(1.8, 'Petrol', 'Manual', 'Automatic')),
      g(2017, null, e(1.5, 'Petrol', 'DCT'), e(1.5, 'Plug-in Hybrid', 'DCT')),
    ),
    s('MG7', g(2023, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s(
      'ZS',
      g(
        2017,
        2023,
        e(1.0, 'Petrol', 'Automatic'),
        e(1.5, 'Petrol', 'Manual', 'Automatic'),
      ),
      g(2024, null, e(1.5, 'Petrol', 'CVT'), e(1.5, 'Hybrid', 'Automatic')),
    ),
    s(
      'ZS EV',
      g(
        2019,
        null,
        e(44.5, 'Electric', 'Single-speed'),
        e(51.1, 'Electric', 'Single-speed'),
        e(72.6, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'HS',
      g(
        2019,
        null,
        e(1.5, 'Petrol', 'Manual', 'DCT'),
        e(2.0, 'Petrol', 'DCT'),
        e(1.5, 'Plug-in Hybrid', 'DCT'),
      ),
    ),
    s('RX5', g(2016, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s('GS', g(2015, 2019, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s(
      'MG4',
      g(
        2022,
        null,
        e(51.0, 'Electric', 'Single-speed'),
        e(64.0, 'Electric', 'Single-speed'),
        e(77.0, 'Electric', 'Single-speed'),
      ),
    ),
    s('Marvel R', g(2021, null, e(70.0, 'Electric', 'Single-speed'))),
    s('One', g(2020, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
  ),

  b(
    'Foton',
    'Chinese commercial-vehicle specialist: light trucks, buses and the Tunland pickup. Very common in African fleet operations.',
    s(
      'Tunland',
      g(
        2012,
        null,
        e(2.8, 'Diesel', 'Manual'),
        e(2.0, 'Diesel', 'Manual', 'Automatic'),
        e(2.4, 'Petrol', 'Manual'),
      ),
    ),
    s(
      'Aumark',
      g(
        2010,
        null,
        e(2.8, 'Diesel', 'Manual'),
        e(3.8, 'Diesel', 'Manual'),
        e(4.1, 'Diesel', 'Manual'),
      ),
    ),
    s(
      'Ollin',
      g(2010, null, e(3.8, 'Diesel', 'Manual'), e(4.1, 'Diesel', 'Manual')),
    ),
    s(
      'Auman',
      g(
        2010,
        null,
        e(6.7, 'Diesel', 'Manual'),
        e(9.7, 'Diesel', 'Manual'),
        e(11.0, 'Diesel', 'Manual'),
      ),
    ),
    s(
      'View',
      g(2010, null, e(2.0, 'Petrol', 'Manual'), e(2.8, 'Diesel', 'Manual')),
    ),
    s(
      'Toano',
      g(2016, null, e(2.8, 'Diesel', 'Manual'), e(2.0, 'Petrol', 'Manual')),
    ),
    s(
      'Gratour',
      g(2012, null, e(1.2, 'Petrol', 'Manual'), e(1.5, 'Petrol', 'Manual')),
    ),
    s(
      'Sauvana',
      g(
        2015,
        null,
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
        e(2.8, 'Diesel', 'Manual'),
      ),
    ),
    s(
      'Forland',
      g(2010, null, e(2.5, 'Diesel', 'Manual'), e(3.7, 'Diesel', 'Manual')),
    ),
  ),

  b(
    'BAIC',
    'Beijing Automotive Industry Corporation; the BJ off-road line and the X-series crossovers are its main export models.',
    s('X25', g(2016, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s('X35', g(2018, null, e(1.5, 'Petrol', 'Manual', 'Automatic'))),
    s('X55', g(2019, null, e(1.5, 'Petrol', 'DCT'))),
    s('X7', g(2020, null, e(1.5, 'Petrol', 'DCT'), e(2.0, 'Petrol', 'DCT'))),
    s(
      'BJ40',
      g(
        2014,
        null,
        e(2.0, 'Petrol', 'Manual', 'Automatic'),
        e(2.3, 'Petrol', 'Automatic'),
        e(2.0, 'Diesel', 'Manual'),
      ),
    ),
    s(
      'BJ80',
      g(
        2016,
        null,
        e(2.3, 'Petrol', 'Automatic'),
        e(3.0, 'Petrol', 'Automatic'),
      ),
    ),
    s(
      'D20',
      g(
        2014,
        null,
        e(1.3, 'Petrol', 'Manual', 'CVT'),
        e(1.5, 'Petrol', 'Manual', 'CVT'),
      ),
    ),
    s('Senova D50', g(2013, null, e(1.5, 'Petrol', 'Manual', 'Automatic'))),
    s(
      'EU5',
      g(
        2018,
        null,
        e(53.7, 'Electric', 'Single-speed'),
        e(60.2, 'Electric', 'Single-speed'),
      ),
    ),
  ),

  b(
    'Jetour',
    'Chery sub-brand launched in 2018, built around family and off-road-styled SUVs.',
    s(
      'X70',
      g(2018, null, e(1.5, 'Petrol', 'Manual', 'DCT'), e(1.6, 'Petrol', 'DCT')),
    ),
    s(
      'X70 Plus',
      g(2020, null, e(1.5, 'Petrol', 'DCT'), e(1.6, 'Petrol', 'DCT')),
    ),
    s('X90', g(2019, null, e(1.5, 'Petrol', 'DCT'), e(1.6, 'Petrol', 'DCT'))),
    s(
      'Dashing',
      g(2022, null, e(1.5, 'Petrol', 'DCT'), e(1.6, 'Petrol', 'DCT')),
    ),
    s(
      'T2',
      g(2023, null, e(1.5, 'Plug-in Hybrid', 'DCT'), e(2.0, 'Petrol', 'DCT')),
    ),
  ),

  b(
    'Wuling',
    'SAIC-GM-Wuling. Micro-vans, people carriers and small EVs; the Hongguang is one of the highest-volume vehicles ever built.',
    s(
      'Hongguang',
      g(
        2010,
        null,
        e(1.2, 'Petrol', 'Manual'),
        e(1.5, 'Petrol', 'Manual', 'AMT'),
      ),
    ),
    s('Confero', g(2017, null, e(1.5, 'Petrol', 'Manual'))),
    s(
      'Cortez',
      g(
        2018,
        null,
        e(1.5, 'Petrol', 'Manual', 'CVT'),
        e(1.8, 'Petrol', 'Manual'),
      ),
    ),
    s('Almaz', g(2019, null, e(1.5, 'Petrol', 'Manual', 'CVT'))),
    s(
      'Bingo',
      g(
        2023,
        null,
        e(17.3, 'Electric', 'Single-speed'),
        e(31.9, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Air EV',
      g(
        2022,
        null,
        e(17.3, 'Electric', 'Single-speed'),
        e(26.7, 'Electric', 'Single-speed'),
      ),
    ),
    s(
      'Mini EV',
      g(
        2020,
        null,
        e(9.3, 'Electric', 'Single-speed'),
        e(13.9, 'Electric', 'Single-speed'),
      ),
    ),
  ),
];
