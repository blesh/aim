declare var require:(s:string)=>any;

require('reflect-metadata');
import 'zone.js';
import { Observable } from '@reactivex/rxjs';
import {
  bootstrap,
  provide,
  Component,
  FORM_BINDINGS,
  CORE_DIRECTIVES,
  View
} from 'angular2/angular2';
import {HTTP_BINDINGS} from 'angular2/http';
import {TypeAhead} from './components/typeahead/typeahead';
import {TickerService} from './services/TickerService';
import {RxPipe} from './services/rx-pipe/rx-pipe';

// Not used yet
var styles = require("!css!sass!./app.scss");

var tickerService = new TickerService('ws://localhost:8081');

const statusLookup = [
  'WAITING FOR CONNECTION',
  'CONNECTED',
  'CLOSED'
];

@Component({
  selector: 'aim-app'
})
@View({
  template: `
    <h1>Angular Investment Manager</h1>
    <h2>Status: {{connectionStatus | rx}}</h2>
    <typeahead (selected)="onSelect($event)"></typeahead>
    <li *ng-for="#ticker of tickers">
      <button (click)="removeTicker(ticker.symbol)"> x </button>
      {{ticker.symbol}}: {{(ticker.prices | rx: 'prices')}}
      <div>{{ (ticker.recentTicks | rx) | json }}</div>
    </li>
  `,
  directives: [TypeAhead, CORE_DIRECTIVES],
  pipes: [RxPipe]
})
class AimApp {
  tickers: Ticker[] = [];

  // map our observable of connection states to
  // more readable status strings
  connectionStatus = tickerService.connectionState
    .map((state: number) => statusLookup[state])

  constructor() {
  }

  onSelect({symbol}){
    const tickers = this.tickers;
    if(tickers.find(x => x.symbol === symbol)) {
      return;
    }

    const ticks = tickerService.getTicker(symbol);
    tickers.push(new Ticker(symbol, ticks));
  }

  removeTicker(symbol){
    const tickers = this.tickers;
    const index = tickers.findIndex(x => x.symbol === symbol);
    if(index !== -1) {
      tickers.splice(index, 1);
    }
  }
}

interface Tick {
  price: number;
  symbol: string;
  timestamp: number;
}

export class Ticker {
  prices: Observable<string>;

  recentTicks: Observable<Tick[]>;

  maxRecentTicks = 40;

  constructor(public symbol: string, public ticks: Observable<Tick>) {
    // take the tick prices and map them into an observable of something
    // more readable.
    this.prices = this.ticks.map((x: Tick) => x.price.toFixed(2));

    // take each tick we're getting and scan it into an
    // observable of arrays, where each array is a list of
    // accumulated values
    this.recentTicks = this.ticks.scan((acc, tick) => {
      let result = [].concat(acc, tick);
      while(result.length > this.maxRecentTicks) {
        result.shift();
      }
      return result;
    })
  }
}

bootstrap(AimApp, [
  FORM_BINDINGS,
  HTTP_BINDINGS
]);
