const { SD } = require('technicalindicators');
const TA = require('../../../utils/technical_analysis');

const SignalResult = require('../dict/signal_result');

let flags = {
  emaCrossUp: false,
  emaCrossDown: false,
  stoch30Up: undefined,
  stoch30Down: undefined,
  stoch30CrossedUp: undefined,
  stoch30CrossedDown: undefined
};

const resetAllFlags = function resetAllFlags() {
  flags = {
    emaCrossUp: false,
    emaCrossDown: false,
    stoch30Up: undefined,
    stoch30Down: undefined,
    stoch30CrossedUp: undefined,
    stoch30CrossedDown: undefined
  };
};

module.exports = class {
  getName() {
    return 'stocha_strat';
  }

  buildIndicator(indicatorBuilder, options) {
    indicatorBuilder.add('ema12', 'ema', '30m', {
      length: 12
    });
    indicatorBuilder.add('ema34', 'ema', '30m', {
      length: 34
    });

    indicatorBuilder.add('stoch30', 'stoch', '30m', {
      length: 5,
      k: 3,
      d: 3
    });
    // indicatorBuilder.add('stoch5', 'stoch', '5m', {
    //   length: 5,
    //   k: 3,
    //   d: 3
    // });
    // indicatorBuilder.add('stoch1', 'stoch', '1m', {
    //   length: 5,
    //   k: 3,
    //   d: 3
    // });
  }

  async period(indicatorPeriod, options) {
    const currentValues = indicatorPeriod.getLatestIndicators();
    if (currentValues) {
      // console.log(Object.keys(currentValues));
    }

    const { ema12 } = currentValues;
    const { ema34 } = currentValues;

    const { stoch30 } = currentValues;

    const emptySignal = SignalResult.createEmptySignal(currentValues);

    if (!indicatorPeriod.getLastSignal()) {
      if (ema12 && ema34 && stoch30) {
        // debugger;
        const currentEma30Up = ema12 > ema34;
        const ema30Down = ema12 < ema34;

        if (flags.emaCrossUp !== currentEma30Up) {
          resetAllFlags();
        }

        const stoch30Up = stoch30.stoch_k > stoch30.stoch_d;
        const stoch30Down = stoch30.stoch_k < stoch30.stoch_d;

        flags.stoch30CrossedUp =
          flags.stoch30CrossedUp ||
          (typeof flags.stoch30Up !== 'undefined' && flags.stoch30Up !== stoch30Up && stoch30Up);

        flags.stoch30CrossedDown =
          flags.stoch30CrossedDown ||
          (typeof flags.stoch30Down !== 'undefined' && flags.stoch30Down !== stoch30Down && stoch30Down);

        if (currentEma30Up && flags.stoch30CrossedUp) {
          console.log('stoch30CrossedUp');
          emptySignal.setSignal('long');
          console.log(`Price LONG: ${indicatorPeriod.getPrice()}`);
        } else if (ema30Down && flags.stoch30CrossedDown) {
          console.log('stoch30CrossedDown');
          emptySignal.setSignal('short');
          console.log(`Price SHORT: ${indicatorPeriod.getPrice()}`);
        }

        flags.emaCrossUp = currentEma30Up;
        flags.emaCrossDown = ema30Down;
        flags.stoch30Up = stoch30Up;
        flags.stoch30Down = stoch30Down;
      }
    }

    // close on profit or lose
    if (indicatorPeriod.getLastSignal()) {
      // console.log(`Price: ${indicatorPeriod.getPrice()}`);
      // console.log(`Amount: ${indicatorPeriod.getStrategyContext().amount}`);
      if (indicatorPeriod.getProfit() > 1.7) {
        // take profit
        console.log(`Price TAKE PROFIT: ${indicatorPeriod.getPrice()}`);
        emptySignal.addDebug('message', 'TP');
        emptySignal.setSignal('close');
        resetAllFlags();
      } else if (indicatorPeriod.getProfit() < -0.15) {
        // stop loss
        console.log(`Price STOP LOSS: ${indicatorPeriod.getPrice()}`);
        emptySignal.addDebug('message', 'SL');
        emptySignal.setSignal('close');
        resetAllFlags();
      }
    }

    return emptySignal;
  }

  getBacktestColumns() {
    return [
      {
        label: 'BollDev',
        value: 'bb.width',
        type: 'cross',
        cross: 'bb.sd'
      },
      {
        label: 'BollPct',
        value: 'bb.percent',
        type: 'oscillator',
        range: [1, 0]
      },
      {
        label: 'rsi',
        value: 'rsi',
        type: 'oscillator'
      },
      {
        label: 'mfi',
        value: 'mfi',
        type: 'oscillator'
      },
      {
        label: 'SMA 50/200',
        value: 'sma50',
        type: 'cross',
        cross: 'sma200'
      },
      {
        label: 'Pivot Points',
        value: 'pivot_points_high_low'
      },
      {
        label: 'Foreign',
        value: 'foreign_candle.close'
      },
      {
        label: 'Top Volume Ranges',
        value: 'ranges'
      },
      {
        label: 'dice',
        value: 'message'
      },
      {
        label: 'zigzag',
        value: row => (row.zigzag && row.zigzag.turningPoint === true ? 'warning' : undefined),
        type: 'icon'
      }
    ];
  }

  getOptions() {
    return {
      period: '1m',
      dice: 6,
      dice_size: 12,
      foreign_pair_exchange: 'binance',
      foreign_pair_period: '1m'
    };
  }

  getTickPeriod() {
    return '1m';
  }
};
