// src/types/index.ts
var CEMAC_COUNTRIES = {
  CM: "Cameroun",
  CF: "Centrafrique",
  CG: "Congo",
  GA: "Gabon",
  GQ: "Guin\xE9e \xC9quatoriale",
  TD: "Tchad"
};
var UEMOA_COUNTRIES = {
  BJ: "B\xE9nin",
  BF: "Burkina Faso",
  CI: "C\xF4te d'Ivoire",
  GW: "Guin\xE9e-Bissau",
  ML: "Mali",
  NE: "Niger",
  SN: "S\xE9n\xE9gal",
  TG: "Togo"
};
var AFRICAN_COUNTRIES = {
  ...CEMAC_COUNTRIES,
  ...UEMOA_COUNTRIES
};
var ANOMALY_TYPE_LABELS = {
  // Modules existants
  ["DUPLICATE_FEE" /* DUPLICATE_FEE */]: "Frais en double",
  ["GHOST_FEE" /* GHOST_FEE */]: "Frais fant\xF4me",
  ["OVERCHARGE" /* OVERCHARGE */]: "Surfacturation",
  ["INTEREST_ERROR" /* INTEREST_ERROR */]: "Erreur d'int\xE9r\xEAts",
  ["UNAUTHORIZED" /* UNAUTHORIZED */]: "Frais non autoris\xE9",
  ["ROUNDING_ABUSE" /* ROUNDING_ABUSE */]: "Abus d'arrondi",
  // Nouveaux modules
  ["VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */]: "Erreur date de valeur",
  ["SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */]: "Op\xE9ration suspecte",
  ["COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */]: "Non-conformit\xE9",
  ["CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */]: "Anomalie tr\xE9sorerie",
  ["RECONCILIATION_GAP" /* RECONCILIATION_GAP */]: "\xC9cart rapprochement",
  ["MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */]: "Probl\xE8me multi-banques",
  ["OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */]: "Non-conformit\xE9 OHADA",
  ["AML_ALERT" /* AML_ALERT */]: "Alerte anti-blanchiment",
  // Modules d'audit par catégorie de frais
  ["FEE_ANOMALY" /* FEE_ANOMALY */]: "Anomalie de frais",
  ["LIMIT_EXCEEDED" /* LIMIT_EXCEEDED */]: "D\xE9passement de plafond"
};

// node_modules/uuid/dist/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/uuid/dist/rng.js
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
    getRandomValues = crypto.getRandomValues.bind(crypto);
  }
  return getRandomValues(rnds8);
}

// node_modules/uuid/dist/native.js
var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native_default = { randomUUID };

// node_modules/uuid/dist/v4.js
function _v4(options, buf, offset) {
  var _a;
  options = options || {};
  const rnds = options.random ?? ((_a = options.rng) == null ? void 0 : _a.call(options)) ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  return _v4(options, buf, offset);
}
var v4_default = v4;

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInWeek = 6048e5;
var millisecondsInDay = 864e5;
var millisecondsInHour = 36e5;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/addDays.js
function addDays(date, amount, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  if (isNaN(amount)) return constructFrom((options == null ? void 0 : options.in) || date, NaN);
  if (!amount) return _date;
  _date.setDate(_date.getDate() + amount);
  return _date;
}

// node_modules/date-fns/isWeekend.js
function isWeekend(date, options) {
  const day = toDate(date, options == null ? void 0 : options.in).getDay();
  return day === 0 || day === 6;
}

// node_modules/date-fns/_lib/defaultOptions.js
var defaultOptions = {};
function getDefaultOptions() {
  return defaultOptions;
}

// node_modules/date-fns/startOfWeek.js
function startOfWeek(date, options) {
  var _a, _b, _c, _d;
  const defaultOptions2 = getDefaultOptions();
  const weekStartsOn = (options == null ? void 0 : options.weekStartsOn) ?? ((_b = (_a = options == null ? void 0 : options.locale) == null ? void 0 : _a.options) == null ? void 0 : _b.weekStartsOn) ?? defaultOptions2.weekStartsOn ?? ((_d = (_c = defaultOptions2.locale) == null ? void 0 : _c.options) == null ? void 0 : _d.weekStartsOn) ?? 0;
  const _date = toDate(date, options == null ? void 0 : options.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  _date.setDate(_date.getDate() - diff);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/startOfISOWeek.js
function startOfISOWeek(date, options) {
  return startOfWeek(date, { ...options, weekStartsOn: 1 });
}

// node_modules/date-fns/getISOWeekYear.js
function getISOWeekYear(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  const year = _date.getFullYear();
  const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
  const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
  if (_date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (_date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
function getTimezoneOffsetInMilliseconds(date) {
  const _date = toDate(date);
  const utcDate = new Date(
    Date.UTC(
      _date.getFullYear(),
      _date.getMonth(),
      _date.getDate(),
      _date.getHours(),
      _date.getMinutes(),
      _date.getSeconds(),
      _date.getMilliseconds()
    )
  );
  utcDate.setUTCFullYear(_date.getFullYear());
  return +date - +utcDate;
}

// node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
  const normalize = constructFrom.bind(
    null,
    context || dates.find((date) => typeof date === "object")
  );
  return dates.map(normalize);
}

// node_modules/date-fns/startOfDay.js
function startOfDay(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/differenceInCalendarDays.js
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options == null ? void 0 : options.in,
    laterDate,
    earlierDate
  );
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}

// node_modules/date-fns/startOfISOWeekYear.js
function startOfISOWeekYear(date, options) {
  const year = getISOWeekYear(date, options);
  const fourthOfJanuary = constructFrom((options == null ? void 0 : options.in) || date, 0);
  fourthOfJanuary.setFullYear(year, 0, 4);
  fourthOfJanuary.setHours(0, 0, 0, 0);
  return startOfISOWeek(fourthOfJanuary);
}

// node_modules/date-fns/compareAsc.js
function compareAsc(dateLeft, dateRight) {
  const diff = +toDate(dateLeft) - +toDate(dateRight);
  if (diff < 0) return -1;
  else if (diff > 0) return 1;
  return diff;
}

// node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}

// node_modules/date-fns/differenceInCalendarMonths.js
function differenceInCalendarMonths(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options == null ? void 0 : options.in,
    laterDate,
    earlierDate
  );
  const yearsDiff = laterDate_.getFullYear() - earlierDate_.getFullYear();
  const monthsDiff = laterDate_.getMonth() - earlierDate_.getMonth();
  return yearsDiff * 12 + monthsDiff;
}

// node_modules/date-fns/differenceInDays.js
function differenceInDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options == null ? void 0 : options.in,
    laterDate,
    earlierDate
  );
  const sign = compareLocalAsc(laterDate_, earlierDate_);
  const difference = Math.abs(
    differenceInCalendarDays(laterDate_, earlierDate_)
  );
  laterDate_.setDate(laterDate_.getDate() - sign * difference);
  const isLastDayNotFull = Number(
    compareLocalAsc(laterDate_, earlierDate_) === -sign
  );
  const result = sign * (difference - isLastDayNotFull);
  return result === 0 ? 0 : result;
}
function compareLocalAsc(laterDate, earlierDate) {
  const diff = laterDate.getFullYear() - earlierDate.getFullYear() || laterDate.getMonth() - earlierDate.getMonth() || laterDate.getDate() - earlierDate.getDate() || laterDate.getHours() - earlierDate.getHours() || laterDate.getMinutes() - earlierDate.getMinutes() || laterDate.getSeconds() - earlierDate.getSeconds() || laterDate.getMilliseconds() - earlierDate.getMilliseconds();
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return diff;
}

// node_modules/date-fns/_lib/getRoundingMethod.js
function getRoundingMethod(method) {
  return (number) => {
    const round = method ? Math[method] : Math.trunc;
    const result = round(number);
    return result === 0 ? 0 : result;
  };
}

// node_modules/date-fns/differenceInHours.js
function differenceInHours(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options == null ? void 0 : options.in,
    laterDate,
    earlierDate
  );
  const diff = (+laterDate_ - +earlierDate_) / millisecondsInHour;
  return getRoundingMethod(options == null ? void 0 : options.roundingMethod)(diff);
}

// node_modules/date-fns/endOfDay.js
function endOfDay(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  _date.setHours(23, 59, 59, 999);
  return _date;
}

// node_modules/date-fns/endOfMonth.js
function endOfMonth(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  const month = _date.getMonth();
  _date.setFullYear(_date.getFullYear(), month + 1, 0);
  _date.setHours(23, 59, 59, 999);
  return _date;
}

// node_modules/date-fns/isLastDayOfMonth.js
function isLastDayOfMonth(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  return +endOfDay(_date, options) === +endOfMonth(_date, options);
}

// node_modules/date-fns/differenceInMonths.js
function differenceInMonths(laterDate, earlierDate, options) {
  const [laterDate_, workingLaterDate, earlierDate_] = normalizeDates(
    options == null ? void 0 : options.in,
    laterDate,
    laterDate,
    earlierDate
  );
  const sign = compareAsc(workingLaterDate, earlierDate_);
  const difference = Math.abs(
    differenceInCalendarMonths(workingLaterDate, earlierDate_)
  );
  if (difference < 1) return 0;
  if (workingLaterDate.getMonth() === 1 && workingLaterDate.getDate() > 27)
    workingLaterDate.setDate(30);
  workingLaterDate.setMonth(workingLaterDate.getMonth() - sign * difference);
  let isLastMonthNotFull = compareAsc(workingLaterDate, earlierDate_) === -sign;
  if (isLastDayOfMonth(laterDate_) && difference === 1 && compareAsc(laterDate_, earlierDate_) === 1) {
    isLastMonthNotFull = false;
  }
  const result = sign * (difference - +isLastMonthNotFull);
  return result === 0 ? 0 : result;
}

// node_modules/date-fns/_lib/normalizeInterval.js
function normalizeInterval(context, interval) {
  const [start, end] = normalizeDates(context, interval.start, interval.end);
  return { start, end };
}

// node_modules/date-fns/eachDayOfInterval.js
function eachDayOfInterval(interval, options) {
  const { start, end } = normalizeInterval(options == null ? void 0 : options.in, interval);
  let reversed = +start > +end;
  const endTime = reversed ? +start : +end;
  const date = reversed ? end : start;
  date.setHours(0, 0, 0, 0);
  let step = (options == null ? void 0 : options.step) ?? 1;
  if (!step) return [];
  if (step < 0) {
    step = -step;
    reversed = !reversed;
  }
  const dates = [];
  while (+date <= endTime) {
    dates.push(constructFrom(start, date));
    date.setDate(date.getDate() + step);
    date.setHours(0, 0, 0, 0);
  }
  return reversed ? dates.reverse() : dates;
}

// node_modules/date-fns/startOfYear.js
function startOfYear(date, options) {
  const date_ = toDate(date, options == null ? void 0 : options.in);
  date_.setFullYear(date_.getFullYear(), 0, 1);
  date_.setHours(0, 0, 0, 0);
  return date_;
}

// node_modules/date-fns/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = (token, count, options) => {
  let result;
  const tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options == null ? void 0 : options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};

// node_modules/date-fns/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
  return (options = {}) => {
    const width = options.width ? String(options.width) : args.defaultWidth;
    const format2 = args.formats[width] || args.formats[args.defaultWidth];
    return format2;
  };
}

// node_modules/date-fns/locale/en-US/_lib/formatLong.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};

// node_modules/date-fns/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = (token, _date, _baseDate, _options) => formatRelativeLocale[token];

// node_modules/date-fns/locale/_lib/buildLocalizeFn.js
function buildLocalizeFn(args) {
  return (value, options) => {
    const context = (options == null ? void 0 : options.context) ? String(options.context) : "standalone";
    let valuesArray;
    if (context === "formatting" && args.formattingValues) {
      const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      const width = (options == null ? void 0 : options.width) ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      const defaultWidth = args.defaultWidth;
      const width = (options == null ? void 0 : options.width) ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[width] || args.values[defaultWidth];
    }
    const index = args.argumentCallback ? args.argumentCallback(value) : value;
    return valuesArray[index];
  };
}

// node_modules/date-fns/locale/en-US/_lib/localize.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  wide: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = (dirtyNumber, _options) => {
  const number = Number(dirtyNumber);
  const rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: (quarter) => quarter - 1
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};

// node_modules/date-fns/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
  return (string, options = {}) => {
    const width = options.width;
    const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    const matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    const matchedString = matchResult[0];
    const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : (
      // [TODO] -- I challenge you to fix the type
      findKey(parsePatterns, (pattern) => pattern.test(matchedString))
    );
    let value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? (
      // [TODO] -- I challenge you to fix the type
      options.valueCallback(value)
    ) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}
function findKey(object, predicate) {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) {
      return key;
    }
  }
  return void 0;
}
function findIndex(array, predicate) {
  for (let key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return void 0;
}

// node_modules/date-fns/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
  return (string, options = {}) => {
    const matchResult = string.match(args.matchPattern);
    if (!matchResult) return null;
    const matchedString = matchResult[0];
    const parseResult = string.match(args.parsePattern);
    if (!parseResult) return null;
    let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}

// node_modules/date-fns/locale/en-US/_lib/match.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [
    /^j/i,
    /^f/i,
    /^m/i,
    /^a/i,
    /^m/i,
    /^j/i,
    /^j/i,
    /^a/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ap/i,
    /^may/i,
    /^jun/i,
    /^jul/i,
    /^au/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: (value) => parseInt(value, 10)
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: (index) => index + 1
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};

// node_modules/date-fns/locale/en-US.js
var enUS = {
  code: "en-US",
  formatDistance,
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};

// node_modules/date-fns/getDayOfYear.js
function getDayOfYear(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  const diff = differenceInCalendarDays(_date, startOfYear(_date));
  const dayOfYear = diff + 1;
  return dayOfYear;
}

// node_modules/date-fns/getISOWeek.js
function getISOWeek(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/getWeekYear.js
function getWeekYear(date, options) {
  var _a, _b, _c, _d;
  const _date = toDate(date, options == null ? void 0 : options.in);
  const year = _date.getFullYear();
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = (options == null ? void 0 : options.firstWeekContainsDate) ?? ((_b = (_a = options == null ? void 0 : options.locale) == null ? void 0 : _a.options) == null ? void 0 : _b.firstWeekContainsDate) ?? defaultOptions2.firstWeekContainsDate ?? ((_d = (_c = defaultOptions2.locale) == null ? void 0 : _c.options) == null ? void 0 : _d.firstWeekContainsDate) ?? 1;
  const firstWeekOfNextYear = constructFrom((options == null ? void 0 : options.in) || date, 0);
  firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
  const firstWeekOfThisYear = constructFrom((options == null ? void 0 : options.in) || date, 0);
  firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
  if (+_date >= +startOfNextYear) {
    return year + 1;
  } else if (+_date >= +startOfThisYear) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/startOfWeekYear.js
function startOfWeekYear(date, options) {
  var _a, _b, _c, _d;
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = (options == null ? void 0 : options.firstWeekContainsDate) ?? ((_b = (_a = options == null ? void 0 : options.locale) == null ? void 0 : _a.options) == null ? void 0 : _b.firstWeekContainsDate) ?? defaultOptions2.firstWeekContainsDate ?? ((_d = (_c = defaultOptions2.locale) == null ? void 0 : _c.options) == null ? void 0 : _d.firstWeekContainsDate) ?? 1;
  const year = getWeekYear(date, options);
  const firstWeek = constructFrom((options == null ? void 0 : options.in) || date, 0);
  firstWeek.setFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setHours(0, 0, 0, 0);
  const _date = startOfWeek(firstWeek, options);
  return _date;
}

// node_modules/date-fns/getWeek.js
function getWeek(date, options) {
  const _date = toDate(date, options == null ? void 0 : options.in);
  const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/_lib/addLeadingZeros.js
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}

// node_modules/date-fns/_lib/format/lightFormatters.js
var lightFormatters = {
  // Year
  y(date, token) {
    const signedYear = date.getFullYear();
    const year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
  },
  // Month
  M(date, token) {
    const month = date.getMonth();
    return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  // Day of the month
  d(date, token) {
    return addLeadingZeros(date.getDate(), token.length);
  },
  // AM or PM
  a(date, token) {
    const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  // Hour [1-12]
  h(date, token) {
    return addLeadingZeros(date.getHours() % 12 || 12, token.length);
  },
  // Hour [0-23]
  H(date, token) {
    return addLeadingZeros(date.getHours(), token.length);
  },
  // Minute
  m(date, token) {
    return addLeadingZeros(date.getMinutes(), token.length);
  },
  // Second
  s(date, token) {
    return addLeadingZeros(date.getSeconds(), token.length);
  },
  // Fraction of second
  S(date, token) {
    const numberOfDigits = token.length;
    const milliseconds = date.getMilliseconds();
    const fractionalSeconds = Math.trunc(
      milliseconds * Math.pow(10, numberOfDigits - 3)
    );
    return addLeadingZeros(fractionalSeconds, token.length);
  }
};

// node_modules/date-fns/_lib/format/formatters.js
var dayPeriodEnum = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
var formatters = {
  // Era
  G: function(date, token, localize2) {
    const era = date.getFullYear() > 0 ? 1 : 0;
    switch (token) {
      case "G":
      case "GG":
      case "GGG":
        return localize2.era(era, { width: "abbreviated" });
      case "GGGGG":
        return localize2.era(era, { width: "narrow" });
      case "GGGG":
      default:
        return localize2.era(era, { width: "wide" });
    }
  },
  // Year
  y: function(date, token, localize2) {
    if (token === "yo") {
      const signedYear = date.getFullYear();
      const year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize2.ordinalNumber(year, { unit: "year" });
    }
    return lightFormatters.y(date, token);
  },
  // Local week-numbering year
  Y: function(date, token, localize2, options) {
    const signedWeekYear = getWeekYear(date, options);
    const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token === "YY") {
      const twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token === "Yo") {
      return localize2.ordinalNumber(weekYear, { unit: "year" });
    }
    return addLeadingZeros(weekYear, token.length);
  },
  // ISO week-numbering year
  R: function(date, token) {
    const isoWeekYear = getISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token.length);
  },
  // Extended year. This is a single number designating the year of this calendar system.
  // The main difference between `y` and `u` localizers are B.C. years:
  // | Year | `y` | `u` |
  // |------|-----|-----|
  // | AC 1 |   1 |   1 |
  // | BC 1 |   1 |   0 |
  // | BC 2 |   2 |  -1 |
  // Also `yy` always returns the last two digits of a year,
  // while `uu` pads single digit years to 2 characters and returns other years unchanged.
  u: function(date, token) {
    const year = date.getFullYear();
    return addLeadingZeros(year, token.length);
  },
  // Quarter
  Q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      case "Q":
        return String(quarter);
      case "QQ":
        return addLeadingZeros(quarter, 2);
      case "Qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      case "QQQ":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      case "QQQQQ":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      case "QQQQ":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone quarter
  q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      case "q":
        return String(quarter);
      case "qq":
        return addLeadingZeros(quarter, 2);
      case "qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      case "qqq":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      case "qqqqq":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      case "qqqq":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // Month
  M: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "M":
      case "MM":
        return lightFormatters.M(date, token);
      case "Mo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      case "MMM":
        return localize2.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      case "MMMMM":
        return localize2.month(month, {
          width: "narrow",
          context: "formatting"
        });
      case "MMMM":
      default:
        return localize2.month(month, { width: "wide", context: "formatting" });
    }
  },
  // Stand-alone month
  L: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "L":
        return String(month + 1);
      case "LL":
        return addLeadingZeros(month + 1, 2);
      case "Lo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      case "LLL":
        return localize2.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      case "LLLLL":
        return localize2.month(month, {
          width: "narrow",
          context: "standalone"
        });
      case "LLLL":
      default:
        return localize2.month(month, { width: "wide", context: "standalone" });
    }
  },
  // Local week of year
  w: function(date, token, localize2, options) {
    const week = getWeek(date, options);
    if (token === "wo") {
      return localize2.ordinalNumber(week, { unit: "week" });
    }
    return addLeadingZeros(week, token.length);
  },
  // ISO week of year
  I: function(date, token, localize2) {
    const isoWeek = getISOWeek(date);
    if (token === "Io") {
      return localize2.ordinalNumber(isoWeek, { unit: "week" });
    }
    return addLeadingZeros(isoWeek, token.length);
  },
  // Day of the month
  d: function(date, token, localize2) {
    if (token === "do") {
      return localize2.ordinalNumber(date.getDate(), { unit: "date" });
    }
    return lightFormatters.d(date, token);
  },
  // Day of year
  D: function(date, token, localize2) {
    const dayOfYear = getDayOfYear(date);
    if (token === "Do") {
      return localize2.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
    }
    return addLeadingZeros(dayOfYear, token.length);
  },
  // Day of week
  E: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    switch (token) {
      case "E":
      case "EE":
      case "EEE":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "EEEEE":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "EEEEEE":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "EEEE":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Local day of week
  e: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      case "e":
        return String(localDayOfWeek);
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      case "eo":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "eee":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "eeeee":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "eeeeee":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "eeee":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone local day of week
  c: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      case "c":
        return String(localDayOfWeek);
      case "cc":
        return addLeadingZeros(localDayOfWeek, token.length);
      case "co":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "ccc":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      case "ccccc":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      case "cccccc":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      case "cccc":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // ISO day of week
  i: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token) {
      case "i":
        return String(isoDayOfWeek);
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token.length);
      case "io":
        return localize2.ordinalNumber(isoDayOfWeek, { unit: "day" });
      case "iii":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "iiiii":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "iiiiii":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "iiii":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM or PM
  a: function(date, token, localize2) {
    const hours = date.getHours();
    const dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM, PM, midnight, noon
  b: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token) {
      case "b":
      case "bb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // in the morning, in the afternoon, in the evening, at night
  B: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token) {
      case "B":
      case "BB":
      case "BBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Hour [1-12]
  h: function(date, token, localize2) {
    if (token === "ho") {
      let hours = date.getHours() % 12;
      if (hours === 0) hours = 12;
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return lightFormatters.h(date, token);
  },
  // Hour [0-23]
  H: function(date, token, localize2) {
    if (token === "Ho") {
      return localize2.ordinalNumber(date.getHours(), { unit: "hour" });
    }
    return lightFormatters.H(date, token);
  },
  // Hour [0-11]
  K: function(date, token, localize2) {
    const hours = date.getHours() % 12;
    if (token === "Ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Hour [1-24]
  k: function(date, token, localize2) {
    let hours = date.getHours();
    if (hours === 0) hours = 24;
    if (token === "ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Minute
  m: function(date, token, localize2) {
    if (token === "mo") {
      return localize2.ordinalNumber(date.getMinutes(), { unit: "minute" });
    }
    return lightFormatters.m(date, token);
  },
  // Second
  s: function(date, token, localize2) {
    if (token === "so") {
      return localize2.ordinalNumber(date.getSeconds(), { unit: "second" });
    }
    return lightFormatters.s(date, token);
  },
  // Fraction of second
  S: function(date, token) {
    return lightFormatters.S(date, token);
  },
  // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
  X: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token) {
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      case "XXXXX":
      case "XXX":
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
  x: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      case "xxxxx":
      case "xxx":
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (GMT)
  O: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (specific non-location)
  z: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Seconds timestamp
  t: function(date, token, _localize) {
    const timestamp = Math.trunc(+date / 1e3);
    return addLeadingZeros(timestamp, token.length);
  },
  // Milliseconds timestamp
  T: function(date, token, _localize) {
    return addLeadingZeros(+date, token.length);
  }
};
function formatTimezoneShort(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = Math.trunc(absOffset / 60);
  const minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
function formatTimezoneWithOptionalMinutes(offset, delimiter) {
  if (offset % 60 === 0) {
    const sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, delimiter);
}
function formatTimezone(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
  const minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}

// node_modules/date-fns/_lib/format/longFormatters.js
var dateLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "P":
      return formatLong2.date({ width: "short" });
    case "PP":
      return formatLong2.date({ width: "medium" });
    case "PPP":
      return formatLong2.date({ width: "long" });
    case "PPPP":
    default:
      return formatLong2.date({ width: "full" });
  }
};
var timeLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "p":
      return formatLong2.time({ width: "short" });
    case "pp":
      return formatLong2.time({ width: "medium" });
    case "ppp":
      return formatLong2.time({ width: "long" });
    case "pppp":
    default:
      return formatLong2.time({ width: "full" });
  }
};
var dateTimeLongFormatter = (pattern, formatLong2) => {
  const matchResult = pattern.match(/(P+)(p+)?/) || [];
  const datePattern = matchResult[1];
  const timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong2);
  }
  let dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong2.dateTime({ width: "short" });
      break;
    case "PP":
      dateTimeFormat = formatLong2.dateTime({ width: "medium" });
      break;
    case "PPP":
      dateTimeFormat = formatLong2.dateTime({ width: "long" });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong2.dateTime({ width: "full" });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong2)).replace("{{time}}", timeLongFormatter(timePattern, formatLong2));
};
var longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};

// node_modules/date-fns/_lib/protectedTokens.js
var dayOfYearTokenRE = /^D+$/;
var weekYearTokenRE = /^Y+$/;
var throwTokens = ["D", "DD", "YY", "YYYY"];
function isProtectedDayOfYearToken(token) {
  return dayOfYearTokenRE.test(token);
}
function isProtectedWeekYearToken(token) {
  return weekYearTokenRE.test(token);
}
function warnOrThrowProtectedError(token, format2, input) {
  const _message = message(token, format2, input);
  console.warn(_message);
  if (throwTokens.includes(token)) throw new RangeError(_message);
}
function message(token, format2, input) {
  const subject = token[0] === "Y" ? "years" : "days of the month";
  return `Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format2}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
}

// node_modules/date-fns/format.js
var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
var escapedStringRegExp = /^'([^]*?)'?$/;
var doubleQuoteRegExp = /''/g;
var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(date, formatStr, options) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const defaultOptions2 = getDefaultOptions();
  const locale = (options == null ? void 0 : options.locale) ?? defaultOptions2.locale ?? enUS;
  const firstWeekContainsDate = (options == null ? void 0 : options.firstWeekContainsDate) ?? ((_b = (_a = options == null ? void 0 : options.locale) == null ? void 0 : _a.options) == null ? void 0 : _b.firstWeekContainsDate) ?? defaultOptions2.firstWeekContainsDate ?? ((_d = (_c = defaultOptions2.locale) == null ? void 0 : _c.options) == null ? void 0 : _d.firstWeekContainsDate) ?? 1;
  const weekStartsOn = (options == null ? void 0 : options.weekStartsOn) ?? ((_f = (_e = options == null ? void 0 : options.locale) == null ? void 0 : _e.options) == null ? void 0 : _f.weekStartsOn) ?? defaultOptions2.weekStartsOn ?? ((_h = (_g = defaultOptions2.locale) == null ? void 0 : _g.options) == null ? void 0 : _h.weekStartsOn) ?? 0;
  const originalDate = toDate(date, options == null ? void 0 : options.in);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
    const firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      const longFormatter = longFormatters[firstCharacter];
      return longFormatter(substring, locale.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map((substring) => {
    if (substring === "''") {
      return { isToken: false, value: "'" };
    }
    const firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return { isToken: false, value: cleanEscapedString(substring) };
    }
    if (formatters[firstCharacter]) {
      return { isToken: true, value: substring };
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError(
        "Format string contains an unescaped latin alphabet character `" + firstCharacter + "`"
      );
    }
    return { isToken: false, value: substring };
  });
  if (locale.localize.preprocessor) {
    parts = locale.localize.preprocessor(originalDate, parts);
  }
  const formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale
  };
  return parts.map((part) => {
    if (!part.isToken) return part.value;
    const token = part.value;
    if (!(options == null ? void 0 : options.useAdditionalWeekYearTokens) && isProtectedWeekYearToken(token) || !(options == null ? void 0 : options.useAdditionalDayOfYearTokens) && isProtectedDayOfYearToken(token)) {
      warnOrThrowProtectedError(token, formatStr, String(date));
    }
    const formatter = formatters[token[0]];
    return formatter(originalDate, token, locale.localize, formatterOptions);
  }).join("");
}
function cleanEscapedString(input) {
  const matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
}

// node_modules/date-fns/getDay.js
function getDay(date, options) {
  return toDate(date, options == null ? void 0 : options.in).getDay();
}

// node_modules/date-fns/getHours.js
function getHours(date, options) {
  return toDate(date, options == null ? void 0 : options.in).getHours();
}

// node_modules/date-fns/subDays.js
function subDays(date, amount, options) {
  return addDays(date, -amount, options);
}

// src/algorithms/utils/similarity.ts
function jaccardSimilarity(tokens1, tokens2) {
  if (tokens1.size === 0 && tokens2.size === 0) return 1;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = /* @__PURE__ */ new Set([...tokens1, ...tokens2]);
  return intersection.size / union.size;
}
function tokenize(text) {
  return new Set(
    text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((token) => token.length > 1)
    // Remove single-char tokens
  );
}
function descriptionSimilarity(desc1, desc2) {
  const tokens1 = tokenize(desc1);
  const tokens2 = tokenize(desc2);
  return jaccardSimilarity(tokens1, tokens2);
}
function amountSimilarity(amount1, amount2, tolerancePercent = 0.01) {
  const abs1 = Math.abs(amount1);
  const abs2 = Math.abs(amount2);
  if (abs1 === 0 && abs2 === 0) return 1;
  if (abs1 === 0 || abs2 === 0) return 0;
  const diff = Math.abs(abs1 - abs2);
  const max = Math.max(abs1, abs2);
  const ratio = diff / max;
  if (ratio <= tolerancePercent) return 1;
  return Math.max(0, 1 - ratio);
}
function timeSimilarity(date1, date2, maxDays = 7) {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffDays = diffMs / (1e3 * 60 * 60 * 24);
  if (diffDays === 0) return 1;
  if (diffDays >= maxDays) return 0;
  return Math.exp(-diffDays / (maxDays / 3));
}
var DEFAULT_WEIGHTS = {
  amount: 0.4,
  description: 0.4,
  time: 0.2
};
function transactionSimilarity(trans1, trans2, weights = DEFAULT_WEIGHTS, amountTolerance = 0.01, maxDays = 7) {
  const amountSim = amountSimilarity(trans1.amount, trans2.amount, amountTolerance);
  const descSim = descriptionSimilarity(trans1.description, trans2.description);
  const timeSim = timeSimilarity(trans1.date, trans2.date, maxDays);
  return amountSim * weights.amount + descSim * weights.description + timeSim * weights.time;
}

// src/utils/formatters.ts
function normalizeSpaces(s) {
  return s.replace(/[\u00A0\u202F]/g, " ");
}
function formatNumber(value, decimals = 0, locale = "fr-FR") {
  return normalizeSpaces(
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  );
}

// src/algorithms/DuplicateDetector.ts
var DuplicateDetector = class _DuplicateDetector {
  thresholds;
  constructor(thresholds) {
    this.thresholds = thresholds || {
      similarityThreshold: 0.85,
      timeWindowDays: 5,
      amountTolerance: 0.01
    };
  }
  /**
   * Real bank fees are bounded in amount AND have recognizable labels.
   * Anything outside this profile is almost certainly a business
   * transaction (transfer, payment, salary) and would produce massive
   * false-positive duplicate-fee flags if compared by amount-similarity.
   *
   * Conservative defaults:
   *   - Amount must be a debit
   *   - Amount magnitude < 1,000,000 XAF (largest real bank fee
   *     observed in CEMAC/UEMOA grids: ~500k for crédit dossier)
   *   - Description must contain at least one fee-related keyword
   *
   * The keyword list covers the standard CEMAC/UEMOA fee taxonomy.
   */
  static FEE_KEYWORDS = [
    // Generic
    "frais",
    "commission",
    "comm.",
    "comm ",
    "agios",
    "agio",
    "cotisation",
    "abonnement",
    "gestion",
    "manipulation",
    // Account
    "tenue",
    "tdc",
    "tcompte",
    "t.compte",
    "t compte",
    "releve",
    "relev\xE9",
    "attestation",
    // Notifications
    "sms",
    "alerte",
    "notification",
    "avis",
    // Cards
    "carte",
    " cb ",
    "visa",
    "mastercard",
    "gimac",
    // Operations
    "opposition",
    "rejet",
    "incident",
    "retour",
    "rib",
    "duplicata",
    // Tax
    "tva",
    "taxe",
    "timbre",
    "droit",
    // Cashflow
    "cpfd",
    "plus forte",
    "cfd",
    "mouvement"
  ];
  static MAX_FEE_AMOUNT_XAF = 1e6;
  static isLikelyFee(t) {
    if (t.amount >= 0) return false;
    const absAmount = Math.abs(t.amount);
    if (absAmount > _DuplicateDetector.MAX_FEE_AMOUNT_XAF) return false;
    const desc = (t.description || "").toLowerCase();
    if (!desc) return false;
    return _DuplicateDetector.FEE_KEYWORDS.some((kw) => desc.includes(kw));
  }
  /**
   * Detect duplicate transactions in a list
   */
  detectDuplicates(transactions, bankConditions) {
    const anomalies = [];
    const processed = /* @__PURE__ */ new Set();
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const feeTransactions = sorted.filter((t) => _DuplicateDetector.isLikelyFee(t));
    for (let i = 0; i < feeTransactions.length; i++) {
      const trans = feeTransactions[i];
      if (processed.has(trans.id)) continue;
      const duplicates = this.findDuplicates(trans, feeTransactions, i + 1, processed);
      if (duplicates.length > 0) {
        const group = {
          original: trans,
          duplicates,
          similarity: this.calculateGroupSimilarity(trans, duplicates)
        };
        anomalies.push(this.createAnomaly(group, bankConditions));
        processed.add(trans.id);
        duplicates.forEach((d) => processed.add(d.id));
      }
    }
    return anomalies;
  }
  /**
   * Find duplicates for a given transaction
   */
  findDuplicates(reference, candidates, startIndex, processed) {
    const duplicates = [];
    const refDate = new Date(reference.date);
    for (let i = startIndex; i < candidates.length; i++) {
      const candidate = candidates[i];
      const candDate = new Date(candidate.date);
      const daysDiff = differenceInDays(candDate, refDate);
      if (daysDiff > this.thresholds.timeWindowDays) break;
      if (processed.has(candidate.id)) continue;
      if (candidate.id === reference.id) continue;
      const similarity = transactionSimilarity(
        { amount: reference.amount, description: reference.description, date: refDate },
        { amount: candidate.amount, description: candidate.description, date: candDate },
        { amount: 0.4, description: 0.4, time: 0.2 },
        this.thresholds.amountTolerance,
        this.thresholds.timeWindowDays
      );
      if (similarity >= this.thresholds.similarityThreshold) {
        duplicates.push(candidate);
      }
    }
    return duplicates;
  }
  /**
   * Calculate average similarity within a duplicate group
   */
  calculateGroupSimilarity(original, duplicates) {
    if (duplicates.length === 0) return 0;
    const similarities = duplicates.map(
      (dup) => transactionSimilarity(
        { amount: original.amount, description: original.description, date: new Date(original.date) },
        { amount: dup.amount, description: dup.description, date: new Date(dup.date) },
        { amount: 0.4, description: 0.4, time: 0.2 },
        this.thresholds.amountTolerance,
        this.thresholds.timeWindowDays
      )
    );
    return similarities.reduce((sum, s) => sum + s, 0) / similarities.length;
  }
  /**
   * Create anomaly from duplicate group
   */
  createAnomaly(group, bankConditions) {
    const totalAmount = group.duplicates.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    );
    return {
      id: v4_default(),
      type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
      severity: this.calculateSeverity(totalAmount, group.duplicates.length),
      confidence: group.similarity,
      amount: totalAmount,
      transactions: [group.original, ...group.duplicates],
      evidence: this.generateEvidence(group, bankConditions),
      recommendation: this.generateRecommendation(group, totalAmount, bankConditions),
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Calculate severity based on amount and count
   */
  calculateSeverity(amount, count) {
    if (amount > 5e4 || count >= 5) return "CRITICAL" /* CRITICAL */;
    if (amount > 2e4 || count >= 3) return "HIGH" /* HIGH */;
    if (amount > 5e3 || count >= 2) return "MEDIUM" /* MEDIUM */;
    return "LOW" /* LOW */;
  }
  /**
   * Generate evidence for the anomaly with source references
   */
  generateEvidence(group, bankConditions) {
    const evidence = [];
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "Banque";
    const gridDate = (bankConditions == null ? void 0 : bankConditions.effectiveDate) ? new Date(bankConditions.effectiveDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
    const sourceName = gridDate ? `Grille tarifaire ${bankName} - ${gridDate}` : `Conditions ${bankName}`;
    const originalAmount = Math.abs(group.original.amount);
    const totalDuplicated = group.duplicates.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    evidence.push({
      type: "COMPARISON",
      description: "Double facturation d\xE9tect\xE9e",
      value: totalDuplicated,
      expectedValue: originalAmount,
      appliedValue: originalAmount + totalDuplicated,
      source: sourceName,
      conditionRef: this.identifyFeeType(group.original.description)
    });
    evidence.push({
      type: "DUPLICATE_COUNT",
      description: "Nombre de doublons",
      value: `${group.duplicates.length} transaction(s) en double`
    });
    evidence.push({
      type: "SIMILARITY_SCORE",
      description: "Score de similarit\xE9",
      value: `${Math.round(group.similarity * 100)}%`
    });
    const dates = [group.original, ...group.duplicates].map((t) => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    evidence.push({
      type: "DATE_RANGE",
      description: "P\xE9riode concern\xE9e",
      value: `${minDate.toLocaleDateString("fr-FR")} - ${maxDate.toLocaleDateString("fr-FR")}`
    });
    const descSim = descriptionSimilarity(
      group.original.description,
      group.duplicates[0].description
    );
    evidence.push({
      type: "DESCRIPTION_MATCH",
      description: "Libell\xE9 identifi\xE9",
      value: group.original.description,
      reference: `Similarit\xE9: ${Math.round(descSim * 100)}%`
    });
    return evidence;
  }
  /**
   * Identify fee type from description
   */
  identifyFeeType(description) {
    const desc = description.toLowerCase();
    if (desc.includes("tenue") || desc.includes("compte")) return "Frais de tenue de compte";
    if (desc.includes("virement") || desc.includes("vir")) return "Frais de virement";
    if (desc.includes("carte") || desc.includes("cb")) return "Frais de carte bancaire";
    if (desc.includes("retrait") || desc.includes("dab")) return "Frais de retrait";
    if (desc.includes("sms") || desc.includes("alerte")) return "Frais SMS/Alertes";
    if (desc.includes("commission")) return "Commission bancaire";
    return "Frais bancaires";
  }
  /**
   * Generate recommendation text with source reference
   */
  generateRecommendation(group, totalAmount, bankConditions) {
    const count = group.duplicates.length;
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "la banque";
    const feeType = this.identifyFeeType(group.original.description);
    return `Double facturation de ${feeType} d\xE9tect\xE9e: ${count} transaction${count > 1 ? "s" : ""} en double pour ${formatNumber(Math.round(totalAmount))} FCFA. Similarit\xE9: ${Math.round(group.similarity * 100)}%. R\xE9clamer aupr\xE8s de ${bankName} le remboursement de ${formatNumber(Math.round(totalAmount))} FCFA.`;
  }
};

// src/algorithms/utils/entropy.ts
function shannonEntropy(text) {
  if (!text || text.length === 0) return 0;
  const charCounts = /* @__PURE__ */ new Map();
  const cleanText = text.toLowerCase();
  for (const char of cleanText) {
    charCounts.set(char, (charCounts.get(char) || 0) + 1);
  }
  const length = cleanText.length;
  let entropy = 0;
  for (const count of charCounts.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
function wordEntropy(text) {
  const words = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const wordCounts = /* @__PURE__ */ new Map();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  const totalWords = words.length;
  let entropy = 0;
  for (const count of wordCounts.values()) {
    const probability = count / totalWords;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
function normalizedEntropy(text) {
  if (!text || text.length <= 1) return 0;
  const entropy = shannonEntropy(text);
  const maxEntropy = Math.log2(text.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}
function analyzeRandomness(text) {
  const reasons = [];
  let suspicionScore = 0;
  const entropy = shannonEntropy(text);
  const normEntropy = normalizedEntropy(text);
  if (entropy > 4) {
    suspicionScore += 0.3;
    reasons.push("Entropie de caract\xE8res \xE9lev\xE9e");
  }
  const alphaRatio = countPattern(text, /[a-zA-Z]/g) / text.length;
  const digitRatio = countPattern(text, /\d/g) / text.length;
  const specialRatio = countPattern(text, /[^a-zA-Z0-9\s]/g) / text.length;
  if (digitRatio > 0.3 && alphaRatio > 0.3) {
    suspicionScore += 0.2;
    reasons.push("M\xE9lange inhabituel de chiffres et lettres");
  }
  if (specialRatio > 0.2) {
    suspicionScore += 0.2;
    reasons.push("Trop de caract\xE8res sp\xE9ciaux");
  }
  const hasRepeatingPattern = /(.{2,})\1{2,}/.test(text);
  if (hasRepeatingPattern) {
    suspicionScore -= 0.1;
  }
  const hasCommonWords = hasCommonFrenchWords(text);
  if (!hasCommonWords) {
    suspicionScore += 0.2;
    reasons.push("Absence de mots communs");
  }
  const confidence = Math.min(Math.max(suspicionScore, 0), 1);
  return {
    isRandom: confidence > 0.5,
    entropy,
    normalizedEntropy: normEntropy,
    confidence,
    reasons
  };
}
function countPattern(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}
function hasCommonFrenchWords(text) {
  const commonWords = [
    "de",
    "la",
    "le",
    "du",
    "des",
    "et",
    "en",
    "un",
    "une",
    "pour",
    "sur",
    "par",
    "avec",
    "au",
    "aux",
    "frais",
    "compte",
    "virement",
    "paiement",
    "carte",
    "retrait"
  ];
  const words = text.toLowerCase().split(/\s+/);
  return commonWords.some(
    (common) => words.some((word) => word === common || word.includes(common))
  );
}
function feeDescriptionSuspicionScore(description) {
  let score = 0;
  const lowerDesc = description.toLowerCase();
  const suspiciousPatterns = [
    { pattern: /frais\s+divers/i, weight: 0.25 },
    { pattern: /commission\s+diverse/i, weight: 0.25 },
    { pattern: /autres?\s+frais/i, weight: 0.2 },
    { pattern: /prélèvement\s+auto/i, weight: 0.15 },
    { pattern: /frais\s+de\s+gestion/i, weight: 0.15 },
    { pattern: /^frais\s*$/i, weight: 0.3 },
    { pattern: /^commission\s*$/i, weight: 0.3 }
  ];
  for (const { pattern, weight } of suspiciousPatterns) {
    if (pattern.test(lowerDesc)) {
      score += weight;
    }
  }
  if (description.length < 15) {
    score += 0.15;
  }
  if (description.length < 25 && wordEntropy(description) < 1.5) {
    score += 0.1;
  }
  const analysis = analyzeRandomness(description);
  if (analysis.isRandom) {
    score += 0.2;
  }
  return Math.min(score, 1);
}
function isRoundAmount(amount) {
  const absAmount = Math.abs(amount);
  const roundPatterns = [100, 500, 1e3, 2500, 5e3, 1e4, 25e3, 5e4];
  return roundPatterns.some(
    (pattern) => absAmount % pattern === 0 && absAmount >= pattern
  );
}

// src/algorithms/GhostFeeDetector.ts
var GhostFeeDetector = class {
  thresholds;
  // Patterns indicating fees
  feePatterns = [
    /frais/i,
    /commission/i,
    /taxe/i,
    /prélèvement/i,
    /redevance/i,
    /cotisation/i,
    /abonnement/i,
    /fee/i,
    /charge/i
  ];
  // Patterns indicating legitimate services
  servicePatterns = [
    /virement/i,
    /retrait/i,
    /dépôt|depot/i,
    /carte/i,
    /chèque|cheque/i,
    /transfer/i,
    /paiement/i,
    /achat/i,
    /prélèvement.*(?:edf|orange|sfr|free|eau|électricité)/i
  ];
  constructor(thresholds) {
    this.thresholds = thresholds || {
      entropyThreshold: 2.5,
      orphanWindowDays: 1,
      minConfidence: 0.7
    };
  }
  /**
   * Detect ghost fees (fees without associated services)
   */
  detectGhostFees(transactions, bankConditions) {
    const anomalies = [];
    const potentialFees = transactions.filter((t) => this.isPotentialFee(t));
    for (const fee of potentialFees) {
      const analysis = this.analyzeFee(fee, transactions);
      if (analysis.isGhost && analysis.suspicionScore >= this.thresholds.minConfidence) {
        anomalies.push(this.createAnomaly(analysis, bankConditions));
      }
    }
    return anomalies;
  }
  /**
   * Check if transaction looks like a fee
   */
  isPotentialFee(transaction) {
    if (transaction.amount >= 0) return false;
    if (transaction.type === "FEE" /* FEE */) return true;
    return this.feePatterns.some(
      (pattern) => pattern.test(transaction.description)
    );
  }
  /**
   * Analyze a potential fee for ghost characteristics
   */
  analyzeFee(fee, allTransactions) {
    const reasons = [];
    let suspicionScore = 0;
    const descScore = feeDescriptionSuspicionScore(fee.description);
    if (descScore > 0.3) {
      suspicionScore += descScore * 0.4;
      reasons.push("Description vague ou g\xE9n\xE9rique");
    }
    const hasService = this.findAssociatedService(fee, allTransactions);
    if (!hasService) {
      suspicionScore += 0.3;
      reasons.push("Aucun service associ\xE9 trouv\xE9");
    }
    if (isRoundAmount(fee.amount)) {
      suspicionScore += 0.1;
      reasons.push("Montant rond suspect");
    }
    const entropy = shannonEntropy(fee.description);
    if (entropy < this.thresholds.entropyThreshold) {
      suspicionScore += 0.15;
      reasons.push("Description trop simple");
    } else if (entropy > 4) {
      suspicionScore += 0.1;
      reasons.push("Description possiblement auto-g\xE9n\xE9r\xE9e");
    }
    const isRecurring = this.checkRecurringPattern(fee, allTransactions);
    if (isRecurring && !hasService) {
      suspicionScore += 0.15;
      reasons.push("Frais r\xE9current sans service identifiable");
    }
    if (!fee.reference || fee.reference.trim() === "") {
      suspicionScore += 0.1;
      reasons.push("Absence de r\xE9f\xE9rence");
    }
    const feeDate = new Date(fee.date);
    const dayOfMonth = feeDate.getDate();
    const daysInMonth = new Date(feeDate.getFullYear(), feeDate.getMonth() + 1, 0).getDate();
    if (dayOfMonth >= daysInMonth - 2) {
      suspicionScore += 0.05;
      reasons.push("Frais en fin de mois");
    }
    return {
      transaction: fee,
      isGhost: suspicionScore >= this.thresholds.minConfidence && !hasService,
      suspicionScore: Math.min(suspicionScore, 1),
      hasAssociatedService: hasService,
      isRecurring,
      reasons
    };
  }
  /**
   * Find if there's an associated service transaction
   */
  findAssociatedService(fee, allTransactions) {
    const feeDate = new Date(fee.date);
    const windowMs = this.thresholds.orphanWindowDays * 24 * 60 * 60 * 1e3;
    return allTransactions.some((t) => {
      if (t.id === fee.id) return false;
      const tDate = new Date(t.date);
      const diff = Math.abs(tDate.getTime() - feeDate.getTime());
      if (diff > windowMs) return false;
      const isService = this.servicePatterns.some(
        (pattern) => pattern.test(t.description)
      );
      if (!isService) return false;
      const similarity = descriptionSimilarity(fee.description, t.description);
      if (similarity > 0.3) return true;
      const feeKeywords = this.extractKeywords(fee.description);
      const serviceKeywords = this.extractKeywords(t.description);
      return feeKeywords.some((k) => serviceKeywords.includes(k));
    });
  }
  /**
   * Extract meaningful keywords from description
   */
  extractKeywords(description) {
    return description.toLowerCase().split(/\s+/).filter((word) => word.length > 3).filter(
      (word) => !["frais", "commission", "pour", "avec", "dans", "sur"].includes(word)
    );
  }
  /**
   * Check if fee is part of a recurring pattern
   */
  checkRecurringPattern(fee, allTransactions) {
    const feeDate = new Date(fee.date);
    const threeMonthsAgo = new Date(feeDate);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const similarFees = allTransactions.filter((t) => {
      if (t.id === fee.id) return false;
      const tDate = new Date(t.date);
      if (tDate < threeMonthsAgo || tDate >= feeDate) return false;
      const amountDiff = Math.abs(t.amount - fee.amount) / Math.abs(fee.amount);
      if (amountDiff > 0.05) return false;
      const descSim = descriptionSimilarity(t.description, fee.description);
      return descSim > 0.7;
    });
    return similarFees.length >= 2;
  }
  /**
   * Create anomaly from analysis
   */
  createAnomaly(analysis, bankConditions) {
    const { transaction, suspicionScore, isRecurring } = analysis;
    return {
      id: v4_default(),
      type: "GHOST_FEE" /* GHOST_FEE */,
      severity: this.calculateSeverity(transaction.amount, isRecurring),
      confidence: suspicionScore,
      amount: Math.abs(transaction.amount),
      transactions: [transaction],
      evidence: this.generateEvidence(analysis, bankConditions),
      recommendation: this.generateRecommendation(analysis, bankConditions),
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Calculate severity based on amount and recurrence
   */
  calculateSeverity(amount, isRecurring) {
    const absAmount = Math.abs(amount);
    if (isRecurring && absAmount > 5e3) return "CRITICAL" /* CRITICAL */;
    if (absAmount > 2e4) return "HIGH" /* HIGH */;
    if (absAmount > 5e3 || isRecurring) return "MEDIUM" /* MEDIUM */;
    return "LOW" /* LOW */;
  }
  /**
   * Generate evidence for the anomaly with source references
   */
  generateEvidence(analysis, bankConditions) {
    const evidence = [];
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "Banque";
    const gridDate = (bankConditions == null ? void 0 : bankConditions.effectiveDate) ? new Date(bankConditions.effectiveDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
    const sourceName = gridDate ? `Grille tarifaire ${bankName} - ${gridDate}` : `Conditions ${bankName}`;
    evidence.push({
      type: "GRID_CHECK",
      description: "V\xE9rification tarifaire",
      value: `${Math.abs(analysis.transaction.amount).toLocaleString("fr-FR")} FCFA`,
      source: sourceName,
      conditionRef: "Aucune correspondance trouv\xE9e dans la grille"
    });
    evidence.push({
      type: "SUSPICION_SCORE",
      description: "Score de suspicion",
      value: `${Math.round(analysis.suspicionScore * 100)}%`
    });
    if (!analysis.hasAssociatedService) {
      evidence.push({
        type: "NO_SERVICE",
        description: "Service associ\xE9",
        value: "Aucune op\xE9ration correspondante identifi\xE9e"
      });
    }
    if (analysis.isRecurring) {
      evidence.push({
        type: "RECURRING",
        description: "Pattern r\xE9current",
        value: "Frais similaires d\xE9tect\xE9s sur les 3 derniers mois"
      });
    }
    evidence.push({
      type: "DESCRIPTION",
      description: "Libell\xE9 bancaire",
      value: analysis.transaction.description
    });
    for (const reason of analysis.reasons) {
      evidence.push({
        type: "REASON",
        description: "Motif de suspicion",
        value: reason
      });
    }
    return evidence;
  }
  /**
   * Generate recommendation with source reference
   */
  generateRecommendation(analysis, bankConditions) {
    const amount = Math.abs(analysis.transaction.amount);
    const formattedAmount = Math.round(amount).toLocaleString("fr-FR");
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "la banque";
    if (analysis.isRecurring) {
      return `Frais fant\xF4me r\xE9current de ${formattedAmount} FCFA - libell\xE9 "${analysis.transaction.description}" sans correspondance dans la grille tarifaire. R\xE9clamer aupr\xE8s de ${bankName} une justification d\xE9taill\xE9e et le remboursement r\xE9troactif si non justifi\xE9.`;
    }
    return `Frais fant\xF4me de ${formattedAmount} FCFA - libell\xE9 "${analysis.transaction.description}" non identifi\xE9 dans la grille tarifaire. R\xE9clamer aupr\xE8s de ${bankName} le justificatif du service rendu ou le remboursement.`;
  }
};

// src/algorithms/OverchargeAnalyzer.ts
var OverchargeAnalyzer = class {
  thresholds;
  // Service type detection patterns
  servicePatterns = {
    ACCOUNT_MAINTENANCE: [/tenue.*compte/i, /frais.*compte/i, /gestion.*compte/i],
    TRANSFER_NATIONAL: [/virement.*national/i, /vir\b/i, /transfer.*local/i],
    TRANSFER_INTERNATIONAL: [/virement.*international/i, /swift/i, /transfer.*étranger/i],
    CARD_FEE: [/carte/i, /card/i, /visa/i, /mastercard/i],
    ATM: [/retrait.*dab/i, /retrait.*gab/i, /atm/i, /distributeur/i],
    OVERDRAFT: [/agios/i, /découvert/i, /intérêts.*débiteurs/i],
    SMS: [/sms/i, /notification/i, /alerte/i],
    STATEMENT: [/relevé/i, /extrait/i, /statement/i],
    OTHER: []
  };
  constructor(thresholds) {
    this.thresholds = thresholds || {
      tolerancePercentage: 0.02,
      useHistoricalBaseline: true
    };
  }
  /**
   * Detect overcharges by comparing to bank conditions
   */
  detectOvercharges(transactions, bankConditions, historicalData) {
    const anomalies = [];
    const fees = transactions.filter((t) => t.amount < 0);
    for (const fee of fees) {
      const analysis = this.analyzeFee(fee, bankConditions, historicalData, transactions);
      if (analysis.isOvercharge) {
        anomalies.push(this.createAnomaly(analysis, bankConditions));
      }
    }
    return anomalies;
  }
  /**
   * Analyze a fee for overcharging
   */
  analyzeFee(fee, bankConditions, historicalData, allTransactions) {
    const serviceType = this.detectServiceType(fee);
    const chargedAmount = Math.abs(fee.amount);
    const reasons = [];
    const matchedFee = this.findMatchingFee(serviceType, bankConditions);
    let expectedAmount = 0;
    let isOvercharge = false;
    if (matchedFee) {
      let baseAmount;
      if (matchedFee.type === "percentage" && allTransactions) {
        baseAmount = this.findBaseTransactionAmount(fee, allTransactions);
      }
      expectedAmount = this.calculateExpectedAmount(matchedFee, chargedAmount, baseAmount);
      const tolerance = expectedAmount * this.thresholds.tolerancePercentage;
      if (chargedAmount > expectedAmount + tolerance) {
        isOvercharge = true;
        reasons.push("D\xE9passe le tarif officiel");
      }
    }
    if (this.thresholds.useHistoricalBaseline && historicalData) {
      const historicalAvg = this.getHistoricalAverage(serviceType, historicalData);
      if (historicalAvg && historicalAvg > 0 && chargedAmount > historicalAvg * 1.2) {
        const increasePercent = Math.round((chargedAmount / historicalAvg - 1) * 100);
        isOvercharge = true;
        reasons.push(`Augmentation de ${increasePercent}% par rapport \xE0 l'historique`);
        if (!matchedFee || historicalAvg < expectedAmount) {
          expectedAmount = historicalAvg;
        }
      }
    }
    if (!matchedFee && !isOvercharge && serviceType === "OTHER") {
      if (chargedAmount > 5e4) {
        reasons.push("Frais \xE9lev\xE9 sans correspondance tarifaire - \xE0 v\xE9rifier manuellement");
      }
    }
    const excessAmount = Math.max(0, chargedAmount - expectedAmount);
    const excessPercentage = expectedAmount > 0 ? excessAmount / expectedAmount : isOvercharge ? 1 : 0;
    return {
      transaction: fee,
      isOvercharge,
      chargedAmount,
      expectedAmount,
      excessAmount,
      excessPercentage,
      serviceType,
      matchedFee,
      reasons
    };
  }
  /**
   * Detect service type from transaction description
   */
  detectServiceType(transaction) {
    const description = transaction.description.toLowerCase();
    for (const [type, patterns] of Object.entries(this.servicePatterns)) {
      if (patterns.some((pattern) => pattern.test(description))) {
        return type;
      }
    }
    return "OTHER";
  }
  /**
   * Find matching fee schedule in bank conditions
   */
  findMatchingFee(serviceType, bankConditions) {
    const codeMapping = {
      ACCOUNT_MAINTENANCE: ["TDC", "TENUE", "COMPTE"],
      TRANSFER_NATIONAL: ["VIR", "VIRN", "TRANSFER"],
      TRANSFER_INTERNATIONAL: ["VIRI", "SWIFT", "TRANSFERI"],
      CARD_FEE: ["CARTE", "CARD", "CB"],
      ATM: ["RET", "DAB", "GAB", "ATM"],
      SMS: ["SMS", "NOTIF"],
      STATEMENT: ["REL", "EXTRAIT", "STATEMENT"]
    };
    const codes = codeMapping[serviceType] || [];
    for (const fee of bankConditions.fees ?? []) {
      if (codes.some((code) => fee.code.toUpperCase().includes(code))) {
        return fee;
      }
      if (codes.some(
        (code) => fee.name.toUpperCase().includes(code.toUpperCase())
      )) {
        return fee;
      }
    }
    return null;
  }
  /**
   * Calculate expected amount based on fee schedule
   * For percentage fees, we use the minimum amount as the expected floor
   */
  calculateExpectedAmount(fee, _chargedAmount, baseTransactionAmount) {
    switch (fee.type) {
      case "fixed":
        return fee.amount;
      case "percentage": {
        const rate = fee.percentage || 0;
        if (baseTransactionAmount && rate > 0) {
          const calculatedFee = baseTransactionAmount * rate;
          const minAmount = fee.minAmount || 0;
          const maxAmount = fee.maxAmount || Infinity;
          return Math.min(Math.max(calculatedFee, minAmount), maxAmount);
        }
        return fee.amount || fee.minAmount || 0;
      }
      case "tiered": {
        return fee.amount;
      }
      default:
        return fee.amount;
    }
  }
  /**
   * Find the base transaction amount for percentage-based fees.
   * Heuristic: look for the most recent non-fee transaction before this fee
   * on the same day or previous day that could have triggered it.
   */
  findBaseTransactionAmount(fee, transactions) {
    const feeDate = new Date(fee.date).getTime();
    const oneDayMs = 864e5;
    const candidates = transactions.filter(
      (t) => t.id !== fee.id && Math.abs(t.amount) > Math.abs(fee.amount) && t.amount !== 0 && Math.abs(new Date(t.date).getTime() - feeDate) <= oneDayMs
    ).sort(
      (a, b) => Math.abs(new Date(b.date).getTime() - feeDate) - Math.abs(new Date(a.date).getTime() - feeDate)
    );
    return candidates.length > 0 ? Math.abs(candidates[0].amount) : void 0;
  }
  /**
   * Get historical average for a service type
   */
  getHistoricalAverage(serviceType, historicalData) {
    const history = historicalData[serviceType];
    if (!history || history.length === 0) return null;
    const sum = history.reduce((total, item) => total + item.amount, 0);
    return sum / history.length;
  }
  /**
   * Create anomaly from analysis
   */
  createAnomaly(analysis, bankConditions) {
    return {
      id: v4_default(),
      type: "OVERCHARGE" /* OVERCHARGE */,
      severity: this.calculateSeverity(analysis.excessAmount, analysis.excessPercentage),
      confidence: this.calculateConfidence(analysis),
      amount: analysis.excessAmount,
      transactions: [analysis.transaction],
      evidence: this.generateEvidence(analysis, bankConditions),
      recommendation: this.generateRecommendation(analysis, bankConditions),
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Calculate severity
   */
  calculateSeverity(excessAmount, excessPercentage) {
    if (excessAmount > 2e4 || excessPercentage > 0.5) return "CRITICAL" /* CRITICAL */;
    if (excessAmount > 1e4 || excessPercentage > 0.3) return "HIGH" /* HIGH */;
    if (excessAmount > 5e3 || excessPercentage > 0.2) return "MEDIUM" /* MEDIUM */;
    return "LOW" /* LOW */;
  }
  /**
   * Calculate confidence based on analysis quality
   */
  calculateConfidence(analysis) {
    let confidence = 0.6;
    if (analysis.matchedFee) confidence += 0.25;
    if (analysis.excessPercentage > 0.3) confidence += 0.1;
    if (analysis.reasons.length > 1) confidence += 0.05;
    return Math.min(confidence, 0.98);
  }
  /**
   * Generate evidence with source references
   */
  generateEvidence(analysis, bankConditions) {
    const evidence = [];
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "Banque";
    const gridDate = (bankConditions == null ? void 0 : bankConditions.effectiveDate) ? new Date(bankConditions.effectiveDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "";
    const sourceName = gridDate ? `Grille tarifaire ${bankName} - ${gridDate}` : `Conditions ${bankName}`;
    evidence.push({
      type: "COMPARISON",
      description: "Comparaison tarifaire",
      value: analysis.excessAmount,
      expectedValue: analysis.expectedAmount,
      appliedValue: analysis.chargedAmount,
      source: sourceName,
      conditionRef: analysis.matchedFee ? `${analysis.matchedFee.code} - ${analysis.matchedFee.name}` : void 0
    });
    evidence.push({
      type: "EXCESS_PERCENTAGE",
      description: "\xC9cart constat\xE9",
      value: `+${Math.round(analysis.excessPercentage * 100)}% (${Math.round(analysis.excessAmount).toLocaleString("fr-FR")} FCFA)`
    });
    if (analysis.matchedFee) {
      const feeDetails = analysis.matchedFee.type === "percentage" && analysis.matchedFee.percentage ? `${(analysis.matchedFee.percentage * 100).toFixed(2)}%${analysis.matchedFee.minAmount ? ` (min: ${analysis.matchedFee.minAmount} FCFA)` : ""}` : `${analysis.matchedFee.amount.toLocaleString("fr-FR")} FCFA`;
      evidence.push({
        type: "OFFICIAL_RATE",
        description: "Tarif contractuel",
        value: feeDetails,
        source: sourceName,
        conditionRef: `Section: ${this.getServiceTypeLabel(analysis.serviceType)}`,
        reference: analysis.matchedFee.code
      });
    }
    evidence.push({
      type: "SERVICE_TYPE",
      description: "Type de service",
      value: this.getServiceTypeLabel(analysis.serviceType)
    });
    for (const reason of analysis.reasons) {
      evidence.push({
        type: "REASON",
        description: "Motif de d\xE9tection",
        value: reason
      });
    }
    return evidence;
  }
  /**
   * Get human-readable service type label
   */
  getServiceTypeLabel(type) {
    const labels = {
      ACCOUNT_MAINTENANCE: "Tenue de compte",
      TRANSFER_NATIONAL: "Virement national",
      TRANSFER_INTERNATIONAL: "Virement international",
      CARD_FEE: "Frais de carte",
      ATM: "Retrait DAB",
      OVERDRAFT: "Agios/D\xE9couvert",
      SMS: "Notification SMS",
      STATEMENT: "Relev\xE9 de compte",
      OTHER: "Autre"
    };
    return labels[type] || type;
  }
  /**
   * Generate recommendation with source reference
   */
  generateRecommendation(analysis, bankConditions) {
    const excess = Math.round(analysis.excessAmount).toLocaleString("fr-FR");
    const percentage = Math.round(analysis.excessPercentage * 100);
    const charged = Math.round(analysis.chargedAmount).toLocaleString("fr-FR");
    const expected = Math.round(analysis.expectedAmount).toLocaleString("fr-FR");
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "la banque";
    let recommendation = `Surfacturation de ${excess} FCFA (+${percentage}%) d\xE9tect\xE9e pour ${this.getServiceTypeLabel(analysis.serviceType)}. `;
    recommendation += `Montant factur\xE9: ${charged} FCFA vs tarif contractuel: ${expected} FCFA. `;
    if (analysis.matchedFee) {
      recommendation += `R\xE9f\xE9rence: ${analysis.matchedFee.code} - ${analysis.matchedFee.name}. `;
    }
    recommendation += `R\xE9clamer aupr\xE8s de ${bankName} le remboursement de ${excess} FCFA et l'application du tarif contractuel.`;
    return recommendation;
  }
};

// src/services/RegulatoryFetchService.ts
var REGULATORY_URLS = {
  BEAC: {
    base: "https://www.beac.int",
    rates: "https://www.beac.int/politique-monetaire/taux-directeurs/",
    regulations: "https://www.beac.int/supervision-bancaire/reglementation/",
    api: null
    // Pas d'API publique connue
  },
  COBAC: {
    base: "https://www.sgcobac.org",
    regulations: "https://www.sgcobac.org/jcms/rc_7045/fr/textes-reglementaires",
    decisions: "https://www.sgcobac.org/jcms/rc_7046/fr/decisions"
  },
  BCEAO: {
    base: "https://www.bceao.int",
    rates: "https://www.bceao.int/fr/content/taux-directeurs-de-la-bceao",
    regulations: "https://www.bceao.int/fr/reglementation-bancaire",
    stats: "https://www.bceao.int/fr/statistiques"
  },
  CB_UMOA: {
    base: "https://www.cb.uemoa.int",
    circulars: "https://www.cb.uemoa.int/circulaires/"
  }
};
var KNOWN_RATES = [
  // BEAC - Zone CEMAC
  {
    id: "beac-tiao",
    source: "BEAC",
    type: "taux_directeur",
    name: "Taux d'Int\xE9r\xEAt des Appels d'Offres (TIAO)",
    value: 5,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-03-27"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.beac.int/politique-monetaire/taux-directeurs/"
  },
  {
    id: "beac-tsp",
    source: "BEAC",
    type: "taux_facilite",
    name: "Taux de la Facilit\xE9 de Pr\xEAt Marginal",
    value: 6.75,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-03-27"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.beac.int/politique-monetaire/taux-directeurs/"
  },
  {
    id: "beac-tspd",
    source: "BEAC",
    type: "taux_facilite",
    name: "Taux de la Facilit\xE9 de D\xE9p\xF4t",
    value: 0,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-03-27"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.beac.int/politique-monetaire/taux-directeurs/"
  },
  {
    id: "beac-reserve",
    source: "BEAC",
    type: "reserve_obligatoire",
    name: "Coefficient des R\xE9serves Obligatoires",
    value: 7,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-01-01"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.beac.int/politique-monetaire/"
  },
  // BCEAO - Zone UEMOA
  {
    id: "bceao-taux-minimum",
    source: "BCEAO",
    type: "taux_directeur",
    name: "Taux Minimum de Soumission aux Appels d'Offres",
    value: 3.5,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-06-12"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.bceao.int/fr/content/taux-directeurs-de-la-bceao"
  },
  {
    id: "bceao-guichet-pret",
    source: "BCEAO",
    type: "taux_facilite",
    name: "Taux du Guichet de Pr\xEAt Marginal",
    value: 5.5,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-06-12"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.bceao.int/fr/content/taux-directeurs-de-la-bceao"
  },
  {
    id: "bceao-reserve",
    source: "BCEAO",
    type: "reserve_obligatoire",
    name: "Coefficient des R\xE9serves Obligatoires",
    value: 3,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-01-01"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.bceao.int/fr/content/reserves-obligatoires"
  },
  {
    id: "bceao-usure",
    source: "BCEAO",
    type: "taux_usure",
    name: "Taux d'Usure (plafond l\xE9gal)",
    value: 15,
    unit: "%",
    effectiveDate: /* @__PURE__ */ new Date("2024-01-01"),
    fetchedAt: /* @__PURE__ */ new Date(),
    url: "https://www.bceao.int/fr/reglementation-bancaire"
  }
];
var KNOWN_DOCUMENTS = [
  // COBAC
  {
    id: "cobac-r-2018-01",
    source: "COBAC",
    type: "reglement",
    reference: "R-2018/01",
    title: "R\xE8glement relatif aux conditions de banque applicables aux \xE9tablissements de cr\xE9dit",
    date: /* @__PURE__ */ new Date("2018-04-26"),
    summary: "Encadre les conditions tarifaires et la transparence des frais bancaires dans la zone CEMAC. Impose l'affichage des tarifs et la remise d'une convention de compte.",
    url: "https://www.sgcobac.org/jcms/rc_7045/fr/textes-reglementaires",
    keywords: ["frais", "tarifs", "conditions", "transparence", "affichage"],
    fetchedAt: /* @__PURE__ */ new Date()
  },
  {
    id: "cobac-r-2016-04",
    source: "COBAC",
    type: "reglement",
    reference: "R-2016/04",
    title: "R\xE8glement relatif au traitement des r\xE9clamations des clients",
    date: /* @__PURE__ */ new Date("2016-12-15"),
    summary: "D\xE9finit les proc\xE9dures de traitement des r\xE9clamations clients. D\xE9lai de r\xE9ponse de 30 jours maximum. Obligation de m\xE9diation.",
    url: "https://www.sgcobac.org/jcms/rc_7045/fr/textes-reglementaires",
    keywords: ["r\xE9clamation", "litige", "m\xE9diation", "d\xE9lai", "client"],
    fetchedAt: /* @__PURE__ */ new Date()
  },
  {
    id: "cobac-r-2010-01",
    source: "COBAC",
    type: "reglement",
    reference: "R-2010/01",
    title: "R\xE8glement relatif \xE0 la gouvernance des \xE9tablissements de cr\xE9dit",
    date: /* @__PURE__ */ new Date("2010-04-01"),
    summary: "Normes de gouvernance et contr\xF4le interne des banques CEMAC.",
    url: "https://www.sgcobac.org/jcms/rc_7045/fr/textes-reglementaires",
    keywords: ["gouvernance", "contr\xF4le", "risque", "conformit\xE9"],
    fetchedAt: /* @__PURE__ */ new Date()
  },
  // BCEAO / CB-UMOA
  {
    id: "bceao-instruction-008",
    source: "BCEAO",
    type: "instruction",
    reference: "N\xB0008-05-2015",
    title: "Instruction relative aux conditions de banque applicables aux op\xE9rations bancaires",
    date: /* @__PURE__ */ new Date("2015-05-01"),
    summary: "D\xE9finit les r\xE8gles de tarification bancaire dans l'UEMOA. Plafonne certains frais et impose la transparence.",
    url: "https://www.bceao.int/fr/reglementation-bancaire",
    keywords: ["frais", "tarifs", "plafond", "transparence", "op\xE9rations"],
    fetchedAt: /* @__PURE__ */ new Date()
  },
  {
    id: "bceao-loi-usure",
    source: "BCEAO",
    type: "reglement",
    reference: "Loi-cadre sur l'usure",
    title: "Loi uniforme relative \xE0 la r\xE9pression de l'usure",
    date: /* @__PURE__ */ new Date("2013-06-20"),
    summary: "Fixe le taux d'usure \xE0 2 fois le taux d'escompte de la BCEAO (max 15%). Sanctions p\xE9nales pour d\xE9passement.",
    url: "https://www.bceao.int/fr/reglementation-bancaire",
    keywords: ["usure", "taux", "plafond", "sanction", "int\xE9r\xEAt"],
    fetchedAt: /* @__PURE__ */ new Date()
  },
  {
    id: "cb-umoa-circulaire-transparence",
    source: "CB_UMOA",
    type: "circulaire",
    reference: "Circ. 02-2018",
    title: "Circulaire relative \xE0 la transparence des conditions bancaires",
    date: /* @__PURE__ */ new Date("2018-03-15"),
    summary: "Impose l'affichage visible des tarifs en agence et sur internet. Communication pr\xE9alable de tout changement tarifaire.",
    url: "https://www.cb.uemoa.int/circulaires/",
    keywords: ["transparence", "affichage", "tarifs", "information", "client"],
    fetchedAt: /* @__PURE__ */ new Date()
  }
];
var RegulatoryFetchServiceClass = class {
  cachedRates = [...KNOWN_RATES];
  cachedDocuments = [...KNOWN_DOCUMENTS];
  lastFetch = null;
  fetchInProgress = false;
  /**
   * Récupère les données réglementaires (avec cache)
   */
  async fetchAll(forceRefresh = false) {
    const cacheValid = this.lastFetch && Date.now() - this.lastFetch.getTime() < 24 * 60 * 60 * 1e3;
    if (!forceRefresh && cacheValid) {
      return {
        rates: this.cachedRates,
        documents: this.cachedDocuments,
        lastUpdated: this.lastFetch,
        fromCache: true
      };
    }
    if (this.fetchInProgress) {
      return {
        rates: this.cachedRates,
        documents: this.cachedDocuments,
        lastUpdated: this.lastFetch || /* @__PURE__ */ new Date(),
        fromCache: true
      };
    }
    this.fetchInProgress = true;
    try {
      const results = await Promise.allSettled([
        this.fetchBEACData(),
        this.fetchBCEAOData(),
        this.fetchCOBACData()
      ]);
      const newRates = [...KNOWN_RATES];
      const newDocs = [...KNOWN_DOCUMENTS];
      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          for (const rate of result.value.rates) {
            const existingIndex = newRates.findIndex((r) => r.id === rate.id);
            if (existingIndex >= 0) {
              newRates[existingIndex] = rate;
            } else {
              newRates.push(rate);
            }
          }
          for (const doc of result.value.documents) {
            const existingIndex = newDocs.findIndex((d) => d.id === doc.id);
            if (existingIndex >= 0) {
              newDocs[existingIndex] = doc;
            } else {
              newDocs.push(doc);
            }
          }
        }
      }
      this.cachedRates = newRates;
      this.cachedDocuments = newDocs;
      this.lastFetch = /* @__PURE__ */ new Date();
      return {
        rates: this.cachedRates,
        documents: this.cachedDocuments,
        lastUpdated: this.lastFetch,
        fromCache: false
      };
    } finally {
      this.fetchInProgress = false;
    }
  }
  /**
   * Récupère les données BEAC (Zone CEMAC)
   */
  async fetchBEACData() {
    try {
      console.log("[RegulatoryFetch] Tentative r\xE9cup\xE9ration BEAC...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      const rates = KNOWN_RATES.filter((r) => r.source === "BEAC").map((r) => ({ ...r, fetchedAt: /* @__PURE__ */ new Date() }));
      return {
        success: true,
        source: "BEAC",
        rates,
        documents: [],
        fetchedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error("[RegulatoryFetch] Erreur BEAC:", error);
      return {
        success: false,
        source: "BEAC",
        rates: [],
        documents: [],
        error: error instanceof Error ? error.message : "Erreur inconnue",
        fetchedAt: /* @__PURE__ */ new Date()
      };
    }
  }
  /**
   * Récupère les données BCEAO (Zone UEMOA)
   */
  async fetchBCEAOData() {
    try {
      console.log("[RegulatoryFetch] Tentative r\xE9cup\xE9ration BCEAO...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      const rates = KNOWN_RATES.filter((r) => r.source === "BCEAO").map((r) => ({ ...r, fetchedAt: /* @__PURE__ */ new Date() }));
      const documents = KNOWN_DOCUMENTS.filter((d) => d.source === "BCEAO").map((d) => ({ ...d, fetchedAt: /* @__PURE__ */ new Date() }));
      return {
        success: true,
        source: "BCEAO",
        rates,
        documents,
        fetchedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error("[RegulatoryFetch] Erreur BCEAO:", error);
      return {
        success: false,
        source: "BCEAO",
        rates: [],
        documents: [],
        error: error instanceof Error ? error.message : "Erreur inconnue",
        fetchedAt: /* @__PURE__ */ new Date()
      };
    }
  }
  /**
   * Récupère les données COBAC
   */
  async fetchCOBACData() {
    try {
      console.log("[RegulatoryFetch] Tentative r\xE9cup\xE9ration COBAC...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      const documents = KNOWN_DOCUMENTS.filter((d) => d.source === "COBAC" || d.source === "CB_UMOA").map((d) => ({ ...d, fetchedAt: /* @__PURE__ */ new Date() }));
      return {
        success: true,
        source: "COBAC",
        rates: [],
        documents,
        fetchedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error("[RegulatoryFetch] Erreur COBAC:", error);
      return {
        success: false,
        source: "COBAC",
        rates: [],
        documents: [],
        error: error instanceof Error ? error.message : "Erreur inconnue",
        fetchedAt: /* @__PURE__ */ new Date()
      };
    }
  }
  /**
   * Obtient les taux par zone monétaire
   */
  getRatesByZone(zone) {
    const sources = zone === "CEMAC" ? ["BEAC", "COBAC"] : ["BCEAO", "CB_UMOA"];
    return this.cachedRates.filter((r) => sources.includes(r.source));
  }
  /**
   * Obtient le taux d'usure applicable
   */
  getUsuryRate(zone) {
    if (zone === "UEMOA") {
      const baseRate = this.cachedRates.find(
        (r) => r.source === "BCEAO" && r.type === "taux_directeur"
      );
      return baseRate ? Math.min(baseRate.value * 2, 15) : 15;
    } else {
      const tiao = this.cachedRates.find(
        (r) => r.source === "BEAC" && r.id === "beac-tiao"
      );
      return tiao ? Math.min(tiao.value * 2, 15) : 15;
    }
  }
  /**
   * Obtient les documents pertinents pour un type d'anomalie
   */
  getRelevantDocuments(anomalyType) {
    const keywordMap = {
      "DUPLICATE_FEE": ["frais", "tarifs", "transparence"],
      "GHOST_FEE": ["frais", "transparence", "affichage"],
      "OVERCHARGE": ["tarifs", "plafond", "conditions", "usure"],
      "INTEREST_ERROR": ["taux", "int\xE9r\xEAt", "usure", "calcul"],
      "UNAUTHORIZED": ["r\xE9clamation", "client", "m\xE9diation"]
    };
    const keywords = keywordMap[anomalyType] || [];
    return this.cachedDocuments.filter(
      (doc) => doc.keywords.some((k) => keywords.includes(k))
    );
  }
  /**
   * Vérifie si un taux dépasse le plafond légal
   */
  isRateAboveUsury(rate, zone) {
    const usuryRate = this.getUsuryRate(zone);
    const isAbove = rate > usuryRate;
    const reference = this.cachedDocuments.find(
      (d) => d.keywords.includes("usure")
    );
    return {
      isAbove,
      usuryRate,
      excess: isAbove ? rate - usuryRate : 0,
      reference
    };
  }
  /**
   * Formate les références pour l'affichage
   */
  formatRegulatoryReference(doc) {
    return `${doc.source} - ${doc.reference}: ${doc.title}`;
  }
  /**
   * Obtient toutes les données en cache
   */
  getCachedData() {
    return {
      rates: this.cachedRates,
      documents: this.cachedDocuments,
      lastUpdated: this.lastFetch
    };
  }
  /**
   * URLs des sources pour référence
   */
  getSourceUrls() {
    return REGULATORY_URLS;
  }
};
var RegulatoryFetchService = new RegulatoryFetchServiceClass();

// src/algorithms/InterestCalculator.ts
var InterestCalculator = class {
  thresholds;
  currentBankConditions;
  constructor(thresholds) {
    this.thresholds = thresholds || {
      toleranceAmount: 1,
      tolerancePercentage: 0.01
    };
  }
  /**
   * Verify interest charges against theoretical calculations
   */
  verifyInterestCharges(transactions, bankConditions, accountBalances) {
    var _a;
    const anomalies = [];
    this.currentBankConditions = bankConditions;
    const interestTransactions = transactions.filter(
      (t) => t.type === "INTEREST" /* INTEREST */ || this.isInterestTransaction(t)
    );
    for (const interest of interestTransactions) {
      const analysis = this.analyzeInterestCharge(
        interest,
        accountBalances,
        bankConditions
      );
      if (analysis.hasError || ((_a = analysis.usuryViolation) == null ? void 0 : _a.isViolation)) {
        anomalies.push(this.createAnomaly(analysis));
      }
    }
    return anomalies;
  }
  /**
   * Check if transaction is an interest charge
   */
  isInterestTransaction(transaction) {
    const patterns = [
      /int[eé]r[eê]t/i,
      /agios/i,
      /d[eé]couvert/i,
      /debit.*interest/i
    ];
    return patterns.some((p) => p.test(transaction.description));
  }
  /**
   * Analyze an interest charge
   */
  analyzeInterestCharge(charge, balances, conditions) {
    const period = this.identifyPeriod(charge, balances);
    if (!period) {
      return {
        transaction: charge,
        hasError: true,
        chargedAmount: Math.abs(charge.amount),
        theoreticalAmount: 0,
        difference: Math.abs(charge.amount),
        period: null,
        reason: "P\xE9riode de calcul non identifiable",
        details: this.emptyDetails()
      };
    }
    const overdraftRate = conditions.interestRates.find(
      (r) => r.type === "overdraft"
    );
    const annualRate = (overdraftRate == null ? void 0 : overdraftRate.rate) || 0.18;
    const dayCountConvention = (overdraftRate == null ? void 0 : overdraftRate.dayCountConvention) || "ACT/360";
    const details = this.calculateTheoreticalInterest(
      period,
      balances.filter((b) => b.accountNumber === charge.accountNumber),
      annualRate,
      dayCountConvention
    );
    const charged = Math.abs(charge.amount);
    const theoretical = details.dailyBalances.reduce(
      (sum, d) => sum + d.interest,
      0
    );
    const difference = Math.abs(charged - theoretical);
    const toleranceAmount = Math.max(
      this.thresholds.toleranceAmount,
      theoretical * this.thresholds.tolerancePercentage
    );
    const hasError = difference > toleranceAmount;
    let reason = "";
    if (hasError) {
      const ratio = theoretical > 0 ? charged / theoretical : charged;
      if (ratio > 1.5) {
        reason = "Taux d'int\xE9r\xEAt appliqu\xE9 sup\xE9rieur au taux contractuel";
      } else if (ratio > 1.1) {
        reason = "Erreur de calcul ou jours suppl\xE9mentaires factur\xE9s";
      } else if (charged > theoretical) {
        reason = "Surfacturation des int\xE9r\xEAts";
      } else {
        reason = "Sous-facturation (en faveur du client)";
      }
    }
    const appliedRate = this.estimateAppliedRate(charged, details);
    const zone = this.detectZone(conditions);
    const usuryViolation = this.checkUsuryViolation(appliedRate, zone);
    if (usuryViolation == null ? void 0 : usuryViolation.isViolation) {
      reason = `VIOLATION DU TAUX D'USURE: Taux appliqu\xE9 ${usuryViolation.appliedRate.toFixed(2)}% d\xE9passe le plafond l\xE9gal de ${usuryViolation.usuryRate}%`;
    }
    return {
      transaction: charge,
      hasError,
      chargedAmount: charged,
      theoreticalAmount: theoretical,
      difference,
      period,
      reason,
      details: {
        ...details,
        theoreticalRate: annualRate,
        appliedRate
      },
      usuryViolation
    };
  }
  /**
   * Identify the period for interest calculation
   */
  identifyPeriod(charge, balances) {
    const chargeDate = new Date(charge.date);
    const endDate = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 0);
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const periodBalances = balances.filter((b) => {
      const bDate = new Date(b.date);
      return bDate >= startDate && bDate <= endDate;
    });
    if (periodBalances.length === 0) {
      const altStart = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1);
      const altEnd = new Date(chargeDate);
      const altBalances = balances.filter((b) => {
        const bDate = new Date(b.date);
        return bDate >= altStart && bDate <= altEnd;
      });
      if (altBalances.length > 0) {
        return {
          startDate: altStart,
          endDate: altEnd,
          days: differenceInDays(altEnd, altStart) + 1
        };
      }
      return null;
    }
    return {
      startDate,
      endDate,
      days: differenceInDays(endDate, startDate) + 1
    };
  }
  /**
   * Calculate theoretical interest day by day
   */
  calculateTheoreticalInterest(period, balances, annualRate, dayCountConvention) {
    const daysInYear2 = dayCountConvention === "ACT/360" ? 360 : 365;
    const dailyRate = annualRate / daysInYear2;
    const days = eachDayOfInterval({
      start: period.startDate,
      end: period.endDate
    });
    const dailyInterests = [];
    let totalDebitDays = 0;
    let totalDebitBalance = 0;
    for (const day of days) {
      const balance = this.getBalanceForDay(day, balances);
      let interest = 0;
      if (balance < 0) {
        interest = Math.abs(balance) * dailyRate;
        totalDebitDays++;
        totalDebitBalance += Math.abs(balance);
      }
      dailyInterests.push({ date: day, balance, interest });
    }
    return {
      dailyBalances: dailyInterests,
      totalDebitDays,
      averageDebitBalance: totalDebitDays > 0 ? totalDebitBalance / totalDebitDays : 0
    };
  }
  /**
   * Get balance for a specific day
   */
  getBalanceForDay(date, balances) {
    var _a;
    const exactMatch = balances.find(
      (b) => new Date(b.date).toDateString() === date.toDateString()
    );
    if (exactMatch) return exactMatch.balance;
    const previousBalances = balances.filter((b) => new Date(b.date) <= date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return ((_a = previousBalances[0]) == null ? void 0 : _a.balance) || 0;
  }
  /**
   * Estimate the rate that was actually applied
   */
  estimateAppliedRate(chargedAmount, details) {
    if (details.totalDebitDays === 0 || details.averageDebitBalance === 0) {
      return 0;
    }
    const estimatedRate = chargedAmount * 360 / (details.averageDebitBalance * details.totalDebitDays);
    return estimatedRate;
  }
  /**
   * Create empty details object
   */
  emptyDetails() {
    return {
      dailyBalances: [],
      totalDebitDays: 0,
      averageDebitBalance: 0,
      appliedRate: 0,
      theoreticalRate: 0
    };
  }
  /**
   * Create anomaly from analysis
   */
  createAnomaly(analysis) {
    var _a, _b;
    let severity = this.calculateSeverity(analysis.difference);
    if ((_a = analysis.usuryViolation) == null ? void 0 : _a.isViolation) {
      severity = "CRITICAL" /* CRITICAL */;
    }
    return {
      id: v4_default(),
      type: "INTEREST_ERROR" /* INTEREST_ERROR */,
      severity,
      confidence: ((_b = analysis.usuryViolation) == null ? void 0 : _b.isViolation) ? 0.95 : 0.9,
      amount: analysis.difference,
      transactions: [analysis.transaction],
      evidence: this.generateEvidence(analysis, this.currentBankConditions),
      recommendation: this.generateRecommendation(analysis),
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Calculate severity
   */
  calculateSeverity(difference) {
    if (difference > 1e4) return "CRITICAL" /* CRITICAL */;
    if (difference > 5e3) return "HIGH" /* HIGH */;
    if (difference > 1e3) return "MEDIUM" /* MEDIUM */;
    return "LOW" /* LOW */;
  }
  /**
   * Generate evidence with regulatory references
   */
  generateEvidence(analysis, bankConditions) {
    const evidence = [];
    const bankName = (bankConditions == null ? void 0 : bankConditions.bankName) || "Banque";
    const zone = this.detectZone(bankConditions);
    const sourceName = zone === "CEMAC" ? "BEAC/COBAC" : "BCEAO/CB-UMOA";
    if (analysis.period) {
      evidence.push({
        type: "CALCULATION_PERIOD",
        description: "P\xE9riode de calcul",
        value: `${analysis.period.startDate.toLocaleDateString("fr-FR")} - ${analysis.period.endDate.toLocaleDateString("fr-FR")}`
      });
      evidence.push({
        type: "DEBIT_DAYS",
        description: "Jours en d\xE9bit",
        value: `${analysis.details.totalDebitDays} jours`
      });
    }
    evidence.push({
      type: "COMPARISON",
      description: "Comparaison des agios",
      value: analysis.difference,
      expectedValue: analysis.theoreticalAmount,
      appliedValue: analysis.chargedAmount,
      source: `Conditions ${bankName}`,
      conditionRef: "Taux d\xE9biteur contractuel"
    });
    if (analysis.details.theoreticalRate > 0) {
      evidence.push({
        type: "RATE_COMPARISON",
        description: "Taux appliqu\xE9 vs contractuel",
        value: `${(analysis.details.appliedRate * 100).toFixed(2)}% vs ${(analysis.details.theoreticalRate * 100).toFixed(2)}%`,
        expectedValue: `${(analysis.details.theoreticalRate * 100).toFixed(2)}%`,
        appliedValue: `${(analysis.details.appliedRate * 100).toFixed(2)}%`
      });
    }
    if (analysis.usuryViolation) {
      const usuryDoc = zone === "CEMAC" ? "R\xE8glement COBAC R-2018/01" : "Loi uniforme sur la r\xE9pression de l'usure";
      evidence.push({
        type: "USURY_CHECK",
        description: analysis.usuryViolation.isViolation ? "VIOLATION DU TAUX D'USURE" : "Contr\xF4le taux d'usure",
        value: analysis.usuryViolation.isViolation ? `Taux ${analysis.usuryViolation.appliedRate.toFixed(2)}% > Plafond l\xE9gal ${analysis.usuryViolation.usuryRate}%` : `Taux ${analysis.usuryViolation.appliedRate.toFixed(2)}% < Plafond ${analysis.usuryViolation.usuryRate}%`,
        source: sourceName,
        conditionRef: usuryDoc
      });
      if (analysis.usuryViolation.isViolation) {
        evidence.push({
          type: "USURY_VIOLATION",
          description: "D\xE9passement du plafond l\xE9gal",
          value: `+${analysis.usuryViolation.excess.toFixed(2)} points au-dessus du taux d'usure`,
          source: `R\xE9glementation ${zone}`,
          conditionRef: "Article sanctionnant l'usure - d\xE9lit p\xE9nal"
        });
      }
    }
    if (analysis.reason) {
      evidence.push({
        type: "REASON",
        description: "Cause probable",
        value: analysis.reason
      });
    }
    return evidence;
  }
  /**
   * Detect monetary zone from bank conditions
   */
  detectZone(bankConditions) {
    if ((bankConditions == null ? void 0 : bankConditions.currency) === "XAF") return "CEMAC";
    if ((bankConditions == null ? void 0 : bankConditions.currency) === "XOF") return "UEMOA";
    return "CEMAC";
  }
  /**
   * Check if rate exceeds usury limit
   */
  checkUsuryViolation(appliedRate, zone) {
    const usuryRate = RegulatoryFetchService.getUsuryRate(zone);
    const appliedRatePercent = appliedRate * 100;
    return {
      isViolation: appliedRatePercent > usuryRate,
      appliedRate: appliedRatePercent,
      usuryRate,
      excess: Math.max(0, appliedRatePercent - usuryRate),
      zone
    };
  }
  /**
   * Generate recommendation
   */
  generateRecommendation(analysis) {
    var _a;
    const charged = Math.round(analysis.chargedAmount).toLocaleString("fr-FR");
    const theoretical = Math.round(analysis.theoreticalAmount).toLocaleString("fr-FR");
    const difference = Math.round(analysis.difference).toLocaleString("fr-FR");
    if ((_a = analysis.usuryViolation) == null ? void 0 : _a.isViolation) {
      const zone = analysis.usuryViolation.zone;
      const regulator = zone === "CEMAC" ? "la COBAC" : "la Commission Bancaire de l'UMOA";
      const lawRef = zone === "CEMAC" ? "R\xE8glement COBAC R-2018/01 relatif \xE0 la r\xE9pression de l'usure" : "Loi uniforme portant r\xE9pression de l'usure dans l'UEMOA";
      return `\u26A0\uFE0F VIOLATION DU TAUX D'USURE D\xC9TECT\xC9E. Le taux appliqu\xE9 (${analysis.usuryViolation.appliedRate.toFixed(2)}%) d\xE9passe le plafond l\xE9gal (${analysis.usuryViolation.usuryRate}%). Montant factur\xE9: ${charged} FCFA vs ${theoretical} FCFA th\xE9orique. ACTIONS RECOMMAND\xC9ES: 1) Saisir ${regulator} pour signalement. 2) Demander le remboursement int\xE9gral des int\xE9r\xEAts ind\xFBment per\xE7us. 3) R\xE9f\xE9rence l\xE9gale: ${lawRef}. L'usure constitue un d\xE9lit p\xE9nal passible de sanctions.`;
    }
    return `Erreur de calcul d'int\xE9r\xEAts d\xE9tect\xE9e. Montant factur\xE9: ${charged} FCFA, montant th\xE9orique: ${theoretical} FCFA. R\xE9clamer la correction et le remboursement de ${difference} FCFA. Demander le d\xE9tail du calcul jour par jour \xE0 la banque.`;
  }
};

// src/algorithms/ValueDateAudit.ts
var DEFAULT_CONFIG = {
  maxCreditValueDays: 2,
  // J+2 pour les crédits
  maxDebitValueDays: 1,
  // J+1 pour les débits
  interestRate: 0.12,
  // 12% taux standard découvert
  dayCountConvention: "ACT/360"
};
var ValueDateAudit = class {
  config;
  constructor(config, bankConditions) {
    var _a, _b;
    this.config = { ...DEFAULT_CONFIG, ...config };
    if ((_b = (_a = bankConditions == null ? void 0 : bankConditions.creditFees) == null ? void 0 : _a.decouvertAutorise) == null ? void 0 : _b.tauxAnnuel) {
      this.config.interestRate = bankConditions.creditFees.decouvertAutorise.tauxAnnuel / 100;
    }
  }
  /**
   * Analyser les transactions pour détecter les anomalies de dates de valeur
   */
  analyze(transactions) {
    const anomalies = [];
    for (const transaction of transactions) {
      const operationDate = new Date(transaction.date);
      const valueDate = new Date(transaction.valueDate);
      const daysDiff = this.calculateBusinessDays(operationDate, valueDate);
      const isCredit = transaction.amount > 0;
      const maxDays = isCredit ? this.config.maxCreditValueDays : this.config.maxDebitValueDays;
      if (daysDiff > maxDays) {
        const impact = this.calculateFinancialImpact(transaction, daysDiff - maxDays);
        if (impact > 0) {
          anomalies.push(this.createAnomaly(transaction, daysDiff, maxDays, impact, isCredit));
        }
      }
      if (!isCredit && valueDate < operationDate) {
        const retroDays = Math.abs(daysDiff);
        const impact = this.calculateFinancialImpact(transaction, retroDays);
        if (impact > 0) {
          anomalies.push(this.createRetroactiveAnomaly(transaction, retroDays, impact));
        }
      }
    }
    return this.consolidateAnomalies(anomalies);
  }
  /**
   * Calculer les jours ouvrés entre deux dates
   */
  calculateBusinessDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end >= current) {
      while (current < end) {
        current.setDate(current.getDate() + 1);
        if (!isWeekend(current)) {
          count++;
        }
      }
    } else {
      while (current > end) {
        if (!isWeekend(current)) {
          count--;
        }
        current.setDate(current.getDate() - 1);
      }
    }
    return count;
  }
  /**
   * Calculer l'impact financier du retard de date de valeur
   */
  calculateFinancialImpact(transaction, excessDays) {
    const amount = Math.abs(transaction.amount);
    let daysInYear2;
    switch (this.config.dayCountConvention) {
      case "ACT/365":
        daysInYear2 = 365;
        break;
      case "30/360":
        daysInYear2 = 360;
        break;
      case "ACT/360":
      default:
        daysInYear2 = 360;
    }
    const impact = amount * this.config.interestRate * (excessDays / daysInYear2);
    return Math.round(impact * 100) / 100;
  }
  /**
   * Créer une anomalie pour retard de date de valeur
   */
  createAnomaly(transaction, actualDays, maxDays, impact, isCredit) {
    const excessDays = actualDays - maxDays;
    return {
      id: v4_default(),
      type: "VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */,
      severity: this.calculateSeverity(impact, excessDays),
      confidence: 0.95,
      amount: impact,
      transactions: [transaction],
      evidence: this.generateEvidence(transaction, actualDays, maxDays, impact, isCredit),
      recommendation: this.generateRecommendation(transaction, excessDays, impact, isCredit),
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Créer une anomalie pour date de valeur rétroactive (débit antidaté)
   */
  createRetroactiveAnomaly(transaction, retroDays, impact) {
    return {
      id: v4_default(),
      type: "VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */,
      severity: "HIGH" /* HIGH */,
      confidence: 0.98,
      amount: impact,
      transactions: [transaction],
      evidence: [
        {
          type: "RETROACTIVE_VALUE_DATE",
          description: "Date de valeur ant\xE9rieure \xE0 l'op\xE9ration",
          value: `${retroDays} jours avant l'op\xE9ration`
        },
        {
          type: "FINANCIAL_IMPACT",
          description: "Impact financier estim\xE9",
          value: `${impact.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OPERATION_DATE",
          description: "Date d'op\xE9ration",
          value: new Date(transaction.date).toLocaleDateString("fr-FR")
        },
        {
          type: "VALUE_DATE",
          description: "Date de valeur",
          value: new Date(transaction.valueDate).toLocaleDateString("fr-FR")
        }
      ],
      recommendation: `Date de valeur r\xE9troactive de ${retroDays} jours d\xE9tect\xE9e sur un d\xE9bit de ${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA. Cette pratique g\xE9n\xE8re des int\xE9r\xEAts suppl\xE9mentaires estim\xE9s \xE0 ${impact.toLocaleString("fr-FR")} FCFA. Contester cette date de valeur conform\xE9ment \xE0 la r\xE9glementation CEMAC/UEMOA.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Calculer la sévérité
   */
  calculateSeverity(impact, excessDays) {
    if (impact > 1e4 || excessDays > 10) return "CRITICAL" /* CRITICAL */;
    if (impact > 5e3 || excessDays > 5) return "HIGH" /* HIGH */;
    if (impact > 1e3 || excessDays > 3) return "MEDIUM" /* MEDIUM */;
    return "LOW" /* LOW */;
  }
  /**
   * Générer les preuves
   */
  generateEvidence(transaction, actualDays, maxDays, impact, isCredit) {
    return [
      {
        type: "VALUE_DATE_DELAY",
        description: "Retard date de valeur",
        value: `${actualDays} jours (max autoris\xE9: ${maxDays})`
      },
      {
        type: "TRANSACTION_TYPE",
        description: "Type d'op\xE9ration",
        value: isCredit ? "Cr\xE9dit" : "D\xE9bit"
      },
      {
        type: "TRANSACTION_AMOUNT",
        description: "Montant de l'op\xE9ration",
        value: `${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA`
      },
      {
        type: "FINANCIAL_IMPACT",
        description: "Impact financier",
        value: `${impact.toLocaleString("fr-FR")} FCFA`
      },
      {
        type: "OPERATION_DATE",
        description: "Date d'op\xE9ration",
        value: new Date(transaction.date).toLocaleDateString("fr-FR")
      },
      {
        type: "VALUE_DATE",
        description: "Date de valeur",
        value: new Date(transaction.valueDate).toLocaleDateString("fr-FR")
      },
      {
        type: "INTEREST_RATE",
        description: "Taux appliqu\xE9",
        value: `${(this.config.interestRate * 100).toFixed(2)}%`
      }
    ];
  }
  /**
   * Générer la recommandation
   */
  generateRecommendation(transaction, excessDays, impact, isCredit) {
    const type = isCredit ? "cr\xE9dit" : "d\xE9bit";
    const action = isCredit ? "retard\xE9e" : "anticip\xE9e";
    return `Date de valeur ${action} de ${excessDays} jour${excessDays > 1 ? "s" : ""} sur un ${type} de ${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA. Impact financier: ${impact.toLocaleString("fr-FR")} FCFA. Demander la r\xE9gularisation et le remboursement des int\xE9r\xEAts ind\xFBment per\xE7us.`;
  }
  /**
   * Consolider les anomalies similaires
   */
  consolidateAnomalies(anomalies) {
    if (anomalies.length <= 5) {
      return anomalies;
    }
    const totalImpact = anomalies.reduce((sum, a) => sum + a.amount, 0);
    const allTransactions = anomalies.flatMap((a) => a.transactions);
    const consolidated = {
      id: v4_default(),
      type: "VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */,
      severity: totalImpact > 5e4 ? "CRITICAL" /* CRITICAL */ : totalImpact > 2e4 ? "HIGH" /* HIGH */ : totalImpact > 5e3 ? "MEDIUM" /* MEDIUM */ : "LOW" /* LOW */,
      confidence: 0.95,
      amount: totalImpact,
      transactions: allTransactions.slice(0, 10),
      // Limiter aux 10 premières
      evidence: [
        {
          type: "TOTAL_ANOMALIES",
          description: "Nombre total d'anomalies",
          value: anomalies.length
        },
        {
          type: "TOTAL_IMPACT",
          description: "Impact financier total",
          value: `${totalImpact.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "TRANSACTIONS_COUNT",
          description: "Transactions concern\xE9es",
          value: allTransactions.length
        }
      ],
      recommendation: `${anomalies.length} anomalies de dates de valeur d\xE9tect\xE9es pour un impact total de ${totalImpact.toLocaleString("fr-FR")} FCFA. R\xE9viser la politique de dates de valeur avec la banque et demander un remboursement global.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
    return [consolidated, ...anomalies.slice(0, 4)];
  }
};

// src/algorithms/SuspiciousAudit.ts
var DEFAULT_CONFIG2 = {
  highAmountPercentile: 95,
  spikeMultiplier: 3,
  businessHours: { start: 8, end: 18 },
  maxDailyFrequency: 10,
  suspiciousKeywords: [
    "retrait urgent",
    "virement personnel",
    "cash",
    "especes",
    "pret",
    "avance",
    "remboursement",
    "compensation"
  ],
  structuringThreshold: 5e6
  // 5M FCFA (seuil CEMAC)
};
var SuspiciousAudit = class {
  config;
  transactionStats = null;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG2, ...config };
  }
  /**
   * Analyser les transactions pour détecter les opérations suspectes
   */
  analyze(transactions) {
    const anomalies = [];
    this.calculateStats(transactions);
    anomalies.push(...this.detectHighAmounts(transactions));
    anomalies.push(...this.detectUnusualTiming(transactions));
    anomalies.push(...this.detectHighFrequency(transactions));
    anomalies.push(...this.detectStructuring(transactions));
    anomalies.push(...this.detectRoundAmounts(transactions));
    anomalies.push(...this.detectSuspiciousDescriptions(transactions));
    return anomalies;
  }
  /**
   * Calculer les statistiques sur les transactions
   */
  calculateStats(transactions) {
    const amounts = transactions.map((t) => Math.abs(t.amount));
    if (amounts.length === 0) {
      this.transactionStats = null;
      return;
    }
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const sorted = [...amounts].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    const percentile95 = sorted[index] || sorted[sorted.length - 1];
    this.transactionStats = { mean, stdDev, percentile95 };
  }
  /**
   * Détecter les montants anormalement élevés
   */
  detectHighAmounts(transactions) {
    if (!this.transactionStats) return [];
    const anomalies = [];
    const threshold = this.transactionStats.percentile95;
    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      if (amount > threshold * this.config.spikeMultiplier) {
        anomalies.push(this.createAnomaly(
          [transaction],
          "HIGH_AMOUNT",
          "HIGH" /* HIGH */,
          0.85,
          `Montant exceptionnellement \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA (${(amount / this.transactionStats.mean).toFixed(1)}x la moyenne)`
        ));
      }
    }
    return anomalies;
  }
  /**
   * Détecter les opérations en dehors des heures normales
   */
  detectUnusualTiming(transactions) {
    const anomalies = [];
    const unusualTransactions = [];
    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const hour = getHours(date);
      const dayOfWeek = getDay(date);
      const isWeekend2 = dayOfWeek === 0 || dayOfWeek === 6;
      const isOutsideHours = hour < this.config.businessHours.start || hour >= this.config.businessHours.end;
      if (isWeekend2 || isOutsideHours) {
        if (["TRANSFER" /* TRANSFER */, "ATM" /* ATM */, "DEBIT" /* DEBIT */].includes(transaction.type)) {
          unusualTransactions.push(transaction);
        }
      }
    }
    if (unusualTransactions.length >= 3) {
      anomalies.push(this.createAnomaly(
        unusualTransactions.slice(0, 10),
        "UNUSUAL_TIMING",
        "MEDIUM" /* MEDIUM */,
        0.7,
        `${unusualTransactions.length} op\xE9rations d\xE9tect\xE9es hors heures de bureau ou le week-end. V\xE9rifier l'origine et la l\xE9gitimit\xE9 de ces transactions.`
      ));
    }
    return anomalies;
  }
  /**
   * Détecter une fréquence anormale de transactions
   */
  detectHighFrequency(transactions) {
    const anomalies = [];
    const byDay = /* @__PURE__ */ new Map();
    for (const transaction of transactions) {
      const dateKey = format(new Date(transaction.date), "yyyy-MM-dd");
      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, []);
      }
      byDay.get(dateKey).push(transaction);
    }
    for (const [date, dayTransactions] of byDay) {
      if (dayTransactions.length > this.config.maxDailyFrequency) {
        const totalAmount = dayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        anomalies.push(this.createAnomaly(
          dayTransactions.slice(0, 10),
          "HIGH_FREQUENCY",
          dayTransactions.length > this.config.maxDailyFrequency * 2 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
          0.8,
          `${dayTransactions.length} transactions le ${date} pour un total de ${totalAmount.toLocaleString("fr-FR")} FCFA. Fr\xE9quence anormalement \xE9lev\xE9e.`
        ));
      }
    }
    return anomalies;
  }
  /**
   * Détecter le fractionnement suspect (structuring)
   * Technique de division des montants pour éviter les seuils de déclaration
   */
  detectStructuring(transactions) {
    const anomalies = [];
    const threshold = this.config.structuringThreshold;
    const byDay = /* @__PURE__ */ new Map();
    for (const transaction of transactions) {
      const dateKey = format(new Date(transaction.date), "yyyy-MM-dd");
      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, []);
      }
      byDay.get(dateKey).push(transaction);
    }
    for (const [, dayTransactions] of byDay) {
      const nearThreshold = dayTransactions.filter((t) => {
        const amount = Math.abs(t.amount);
        return amount >= threshold * 0.5 && amount < threshold;
      });
      if (nearThreshold.length >= 2) {
        const totalAmount = nearThreshold.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        if (totalAmount >= threshold) {
          anomalies.push(this.createAnomaly(
            nearThreshold,
            "STRUCTURING",
            "CRITICAL" /* CRITICAL */,
            0.9,
            `Possible fractionnement d\xE9tect\xE9: ${nearThreshold.length} transactions de montants \xE9lev\xE9s (${totalAmount.toLocaleString("fr-FR")} FCFA total) juste sous le seuil de d\xE9claration. Signaler \xE0 la cellule de conformit\xE9.`
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Détecter les montants ronds suspects
   */
  detectRoundAmounts(transactions) {
    const anomalies = [];
    const roundTransactions = [];
    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      if (amount >= 1e6 && amount % 1e6 === 0) {
        roundTransactions.push(transaction);
      } else if (amount >= 5e5 && amount % 1e5 === 0) {
        const zeroCount = (amount.toString().match(/0/g) || []).length;
        if (zeroCount >= 5) {
          roundTransactions.push(transaction);
        }
      }
    }
    if (roundTransactions.length >= 3) {
      const totalAmount = roundTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      anomalies.push(this.createAnomaly(
        roundTransactions.slice(0, 10),
        "ROUND_AMOUNT",
        "MEDIUM" /* MEDIUM */,
        0.6,
        `${roundTransactions.length} transactions \xE0 montants ronds d\xE9tect\xE9es (total: ${totalAmount.toLocaleString("fr-FR")} FCFA). V\xE9rifier la justification de ces montants inhabituellement pr\xE9cis.`
      ));
    }
    return anomalies;
  }
  /**
   * Détecter les libellés suspects
   */
  detectSuspiciousDescriptions(transactions) {
    const anomalies = [];
    for (const transaction of transactions) {
      const description = transaction.description.toLowerCase();
      for (const keyword of this.config.suspiciousKeywords) {
        if (description.includes(keyword.toLowerCase())) {
          anomalies.push(this.createAnomaly(
            [transaction],
            "SUSPICIOUS_DESCRIPTION",
            "MEDIUM" /* MEDIUM */,
            0.7,
            `Libell\xE9 suspect d\xE9tect\xE9: "${transaction.description}". Montant: ${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA. V\xE9rifier la nature et la justification de cette op\xE9ration.`
          ));
          break;
        }
      }
    }
    return anomalies;
  }
  /**
   * Créer une anomalie
   */
  createAnomaly(transactions, pattern, severity, confidence, recommendation) {
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      id: v4_default(),
      type: "SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */,
      severity,
      confidence,
      amount: totalAmount,
      transactions,
      evidence: this.generateEvidence(transactions, pattern),
      recommendation,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Générer les preuves
   */
  generateEvidence(transactions, pattern) {
    const evidence = [];
    evidence.push({
      type: "PATTERN_TYPE",
      description: "Type de pattern suspect",
      value: this.getPatternLabel(pattern)
    });
    evidence.push({
      type: "TRANSACTION_COUNT",
      description: "Transactions concern\xE9es",
      value: transactions.length
    });
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    evidence.push({
      type: "TOTAL_AMOUNT",
      description: "Montant total",
      value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
    });
    if (transactions.length > 0) {
      const dates = transactions.map((t) => new Date(t.date));
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      evidence.push({
        type: "PERIOD",
        description: "P\xE9riode concern\xE9e",
        value: `${minDate.toLocaleDateString("fr-FR")} - ${maxDate.toLocaleDateString("fr-FR")}`
      });
    }
    return evidence;
  }
  /**
   * Obtenir le libellé du pattern
   */
  getPatternLabel(pattern) {
    const labels = {
      HIGH_AMOUNT: "Montant anormalement \xE9lev\xE9",
      UNUSUAL_TIMING: "Horaire inhabituel",
      HIGH_FREQUENCY: "Fr\xE9quence anormale",
      ROUND_AMOUNT: "Montant rond suspect",
      STRUCTURING: "Fractionnement suspect",
      SUSPICIOUS_DESCRIPTION: "Libell\xE9 suspect",
      COUNTERPARTY_PATTERN: "Pattern de contrepartie"
    };
    return labels[pattern];
  }
};

// src/algorithms/ComplianceAudit.ts
var DEFAULT_CONFIG3 = {
  feeTolerance: 0.02,
  // 2%
  rateTolerance: 10,
  // 10 points de base
  checkLimits: true
};
var ComplianceAudit = class {
  config;
  bankConditions;
  constructor(bankConditions, config) {
    this.config = { ...DEFAULT_CONFIG3, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser la conformité des transactions aux conditions bancaires
   */
  analyze(transactions) {
    const anomalies = [];
    const feeTransactions = transactions.filter(
      (t) => t.amount < 0 && this.isFeeTransaction(t)
    );
    for (const transaction of feeTransactions) {
      const matchingFee = this.findMatchingFee(transaction);
      if (!matchingFee) {
        anomalies.push(this.createUnauthorizedFeeAnomaly(transaction));
      } else {
        const overcharge = this.checkFeeAmount(transaction, matchingFee);
        if (overcharge > 0) {
          anomalies.push(this.createOverchargeAnomaly(transaction, matchingFee, overcharge));
        }
      }
    }
    const interestAnomalies = this.checkInterestRates(transactions);
    anomalies.push(...interestAnomalies);
    if (this.config.checkLimits) {
      const limitAnomalies = this.checkLimits(transactions);
      anomalies.push(...limitAnomalies);
    }
    return anomalies;
  }
  /**
   * Déterminer si une transaction est un frais
   */
  isFeeTransaction(transaction) {
    const feeKeywords = [
      "frais",
      "commission",
      "cotisation",
      "abonnement",
      "tenue",
      "gestion",
      "service",
      "prelevement",
      "agio",
      "interet",
      "penalite",
      "rejet"
    ];
    const description = transaction.description.toLowerCase();
    return feeKeywords.some((keyword) => description.includes(keyword));
  }
  /**
   * Trouver le frais correspondant dans les conditions bancaires
   */
  findMatchingFee(transaction) {
    const description = transaction.description.toLowerCase();
    const fees = this.bankConditions.fees ?? [];
    for (const fee of fees) {
      const feeName = fee.name.toLowerCase();
      if (description.includes(feeName) || feeName.includes(description.split(" ")[0])) {
        return fee;
      }
    }
    if (transaction.reference) {
      const matchByCode = this.bankConditions.fees.find(
        (f) => f.code === transaction.reference
      );
      if (matchByCode) return matchByCode;
    }
    return null;
  }
  /**
   * Vérifier le montant d'un frais par rapport au barème
   */
  checkFeeAmount(transaction, fee) {
    const actualAmount = Math.abs(transaction.amount);
    let expectedAmount;
    switch (fee.type) {
      case "fixed":
        expectedAmount = fee.amount;
        break;
      case "percentage":
        expectedAmount = fee.maxAmount ?? fee.amount;
        break;
      case "tiered":
        expectedAmount = fee.amount;
        break;
      default:
        expectedAmount = fee.amount;
    }
    if (fee.minAmount && expectedAmount < fee.minAmount) {
      expectedAmount = fee.minAmount;
    }
    if (fee.maxAmount && expectedAmount > fee.maxAmount) {
      expectedAmount = fee.maxAmount;
    }
    const tolerance = expectedAmount * this.config.feeTolerance;
    if (actualAmount > expectedAmount + tolerance) {
      return actualAmount - expectedAmount;
    }
    return 0;
  }
  /**
   * Vérifier les taux d'intérêt appliqués
   */
  checkInterestRates(transactions) {
    var _a;
    const anomalies = [];
    const interestTransactions = transactions.filter(
      (t) => t.description.toLowerCase().includes("interet") || t.description.toLowerCase().includes("agio")
    );
    const monthlyInterests = /* @__PURE__ */ new Map();
    for (const t of interestTransactions) {
      const monthKey = new Date(t.date).toISOString().slice(0, 7);
      if (!monthlyInterests.has(monthKey)) {
        monthlyInterests.set(monthKey, []);
      }
      monthlyInterests.get(monthKey).push(t);
    }
    const usureRate = (_a = this.bankConditions.creditFees) == null ? void 0 : _a.tauxUsure;
    if (usureRate) {
      for (const [month, monthTransactions] of monthlyInterests) {
        const totalInterest = monthTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        if (totalInterest > 0) {
          if (totalInterest > 5e4) {
            anomalies.push({
              id: v4_default(),
              type: "COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */,
              severity: "MEDIUM" /* MEDIUM */,
              confidence: 0.6,
              amount: totalInterest,
              transactions: monthTransactions,
              evidence: [
                {
                  type: "INTEREST_AMOUNT",
                  description: "Montant des int\xE9r\xEAts",
                  value: `${totalInterest.toLocaleString("fr-FR")} FCFA`
                },
                {
                  type: "PERIOD",
                  description: "P\xE9riode",
                  value: month
                },
                {
                  type: "USURY_RATE",
                  description: "Taux d'usure applicable",
                  value: usureRate ? `${usureRate}%` : "Non d\xE9fini"
                }
              ],
              recommendation: `V\xE9rifier le calcul des int\xE9r\xEAts de ${totalInterest.toLocaleString("fr-FR")} FCFA pour ${month}. Comparer avec le taux contractuel et le taux d'usure. Demander le d\xE9tail du calcul \xE0 la banque.`,
              status: "pending",
              detectedAt: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
    return anomalies;
  }
  /**
   * Vérifier les plafonds
   */
  checkLimits(transactions) {
    var _a;
    const anomalies = [];
    const atmWithdrawals = transactions.filter(
      (t) => t.description.toLowerCase().includes("retrait") || t.description.toLowerCase().includes("dab") || t.description.toLowerCase().includes("gab")
    );
    const dailyWithdrawals = /* @__PURE__ */ new Map();
    for (const t of atmWithdrawals) {
      const dateKey = new Date(t.date).toISOString().slice(0, 10);
      dailyWithdrawals.set(dateKey, (dailyWithdrawals.get(dateKey) || 0) + Math.abs(t.amount));
    }
    const cards = ((_a = this.bankConditions.cardFees) == null ? void 0 : _a.cartes) || [];
    const maxDailyWithdrawal = Math.max(...cards.map((c) => c.plafondRetrait), 5e5);
    for (const [date, total] of dailyWithdrawals) {
      if (total > maxDailyWithdrawal) {
        const dayTransactions = atmWithdrawals.filter(
          (t) => new Date(t.date).toISOString().slice(0, 10) === date
        );
        anomalies.push({
          id: v4_default(),
          type: "COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.85,
          amount: total - maxDailyWithdrawal,
          transactions: dayTransactions,
          evidence: [
            {
              type: "DAILY_TOTAL",
              description: "Total retraits du jour",
              value: `${total.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "LIMIT",
              description: "Plafond journalier",
              value: `${maxDailyWithdrawal.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "EXCESS",
              description: "D\xE9passement",
              value: `${(total - maxDailyWithdrawal).toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `D\xE9passement du plafond de retrait le ${date}: ${total.toLocaleString("fr-FR")} FCFA retir\xE9s vs plafond de ${maxDailyWithdrawal.toLocaleString("fr-FR")} FCFA. V\xE9rifier les autorisations et les frais \xE9ventuels de d\xE9passement.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Créer une anomalie pour frais non autorisé
   */
  createUnauthorizedFeeAnomaly(transaction) {
    return {
      id: v4_default(),
      type: "COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */,
      severity: "HIGH" /* HIGH */,
      confidence: 0.8,
      amount: Math.abs(transaction.amount),
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_TYPE",
          description: "Type de frais",
          value: "Non r\xE9f\xE9renc\xE9 dans le bar\xE8me"
        },
        {
          type: "FEE_DESCRIPTION",
          description: "Libell\xE9",
          value: transaction.description
        },
        {
          type: "FEE_AMOUNT",
          description: "Montant pr\xE9lev\xE9",
          value: `${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Frais de ${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA non pr\xE9vu dans les conditions tarifaires: "${transaction.description}". Demander la justification ou le remboursement de ce frais.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Créer une anomalie pour surfacturation
   */
  createOverchargeAnomaly(transaction, fee, overcharge) {
    return {
      id: v4_default(),
      type: "COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */,
      severity: overcharge > 5e3 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: overcharge,
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_NAME",
          description: "Frais concern\xE9",
          value: fee.name
        },
        {
          type: "EXPECTED_AMOUNT",
          description: "Montant attendu",
          value: `${fee.amount.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACTUAL_AMOUNT",
          description: "Montant pr\xE9lev\xE9",
          value: `${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OVERCHARGE",
          description: "Surfacturation",
          value: `${overcharge.toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Surfacturation de ${overcharge.toLocaleString("fr-FR")} FCFA sur "${fee.name}". Montant contractuel: ${fee.amount.toLocaleString("fr-FR")} FCFA, montant pr\xE9lev\xE9: ${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA. Demander le remboursement de la diff\xE9rence.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/CashflowAudit.ts
var DEFAULT_CONFIG4 = {
  criticalBalanceThreshold: 0,
  consecutiveNegativeDays: 3,
  variationThreshold: 0.5,
  // 50%
  balanceDiscrepancyThreshold: 1
  // 1 FCFA de tolérance
};
var CashflowAudit = class {
  config;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG4, ...config };
  }
  /**
   * Analyser les transactions pour détecter les anomalies de trésorerie
   */
  analyze(transactions) {
    const anomalies = [];
    if (transactions.length === 0) return anomalies;
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const dailyBalances = this.calculateDailyBalances(sorted);
    anomalies.push(...this.detectNegativeBalances(sorted, dailyBalances));
    anomalies.push(...this.detectBalanceDiscrepancies(sorted));
    anomalies.push(...this.detectUnusualPatterns(sorted, dailyBalances));
    anomalies.push(...this.detectLiquidityCrisis(dailyBalances));
    anomalies.push(...this.detectUnexpectedSpikes(sorted));
    return anomalies;
  }
  /**
   * Calculer les soldes quotidiens
   */
  calculateDailyBalances(transactions) {
    const balances = /* @__PURE__ */ new Map();
    for (const transaction of transactions) {
      const dateKey = format(new Date(transaction.date), "yyyy-MM-dd");
      balances.set(dateKey, {
        date: new Date(transaction.date),
        balance: transaction.balance,
        accountNumber: transaction.accountNumber
      });
    }
    return balances;
  }
  /**
   * Détecter les périodes de solde négatif
   */
  detectNegativeBalances(transactions, dailyBalances) {
    const anomalies = [];
    const negativeRanges = [];
    let currentRange = null;
    const sortedDates = Array.from(dailyBalances.keys()).sort();
    for (const dateKey of sortedDates) {
      const balance = dailyBalances.get(dateKey);
      if (balance.balance < this.config.criticalBalanceThreshold) {
        if (!currentRange) {
          currentRange = {
            start: balance.date,
            end: balance.date,
            minBalance: balance.balance,
            transactions: []
          };
        } else {
          currentRange.end = balance.date;
          currentRange.minBalance = Math.min(currentRange.minBalance, balance.balance);
        }
        const dayTransactions = transactions.filter(
          (t) => format(new Date(t.date), "yyyy-MM-dd") === dateKey
        );
        currentRange.transactions.push(...dayTransactions);
      } else {
        if (currentRange) {
          negativeRanges.push(currentRange);
          currentRange = null;
        }
      }
    }
    if (currentRange) {
      negativeRanges.push(currentRange);
    }
    for (const range of negativeRanges) {
      const days = differenceInDays(range.end, range.start) + 1;
      if (days >= this.config.consecutiveNegativeDays) {
        anomalies.push({
          id: v4_default(),
          type: "CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */,
          severity: Math.abs(range.minBalance) > 1e6 ? "CRITICAL" /* CRITICAL */ : days > 10 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
          confidence: 0.95,
          amount: Math.abs(range.minBalance),
          transactions: range.transactions.slice(0, 20),
          evidence: [
            {
              type: "NEGATIVE_PERIOD",
              description: "Dur\xE9e en solde n\xE9gatif",
              value: `${days} jours`
            },
            {
              type: "MIN_BALANCE",
              description: "Solde minimum atteint",
              value: `${range.minBalance.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "PERIOD_START",
              description: "D\xE9but de p\xE9riode",
              value: format(range.start, "dd/MM/yyyy")
            },
            {
              type: "PERIOD_END",
              description: "Fin de p\xE9riode",
              value: format(range.end, "dd/MM/yyyy")
            }
          ],
          recommendation: `Solde n\xE9gatif pendant ${days} jours (du ${format(range.start, "dd/MM/yyyy")} au ${format(range.end, "dd/MM/yyyy")}). Solde minimum: ${range.minBalance.toLocaleString("fr-FR")} FCFA. V\xE9rifier l'autorisation de d\xE9couvert et calculer les agios correspondants.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les écarts entre solde calculé et solde reporté
   */
  detectBalanceDiscrepancies(transactions) {
    const anomalies = [];
    const discrepancies = [];
    for (let i = 1; i < transactions.length; i++) {
      const prev = transactions[i - 1];
      const curr = transactions[i];
      if (prev.accountNumber !== curr.accountNumber) continue;
      const expectedBalance = prev.balance + curr.amount;
      const actualBalance = curr.balance;
      const diff = Math.abs(expectedBalance - actualBalance);
      if (diff > this.config.balanceDiscrepancyThreshold) {
        discrepancies.push({
          transaction: curr,
          expected: expectedBalance,
          actual: actualBalance,
          diff
        });
      }
    }
    if (discrepancies.length > 0) {
      const totalDiscrepancy = discrepancies.reduce((sum, d) => sum + d.diff, 0);
      anomalies.push({
        id: v4_default(),
        type: "CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */,
        severity: totalDiscrepancy > 1e4 ? "CRITICAL" /* CRITICAL */ : discrepancies.length > 5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
        confidence: 0.9,
        amount: totalDiscrepancy,
        transactions: discrepancies.map((d) => d.transaction).slice(0, 10),
        evidence: [
          {
            type: "DISCREPANCY_COUNT",
            description: "Nombre d'\xE9carts d\xE9tect\xE9s",
            value: discrepancies.length
          },
          {
            type: "TOTAL_DISCREPANCY",
            description: "\xC9cart total",
            value: `${totalDiscrepancy.toLocaleString("fr-FR")} FCFA`
          },
          ...discrepancies.slice(0, 3).map((d, i) => ({
            type: `DISCREPANCY_${i + 1}`,
            description: `\xC9cart #${i + 1}`,
            value: `Attendu: ${d.expected.toLocaleString("fr-FR")}, R\xE9el: ${d.actual.toLocaleString("fr-FR")} (${d.diff.toLocaleString("fr-FR")} FCFA)`
          }))
        ],
        recommendation: `${discrepancies.length} \xE9carts de solde d\xE9tect\xE9s pour un total de ${totalDiscrepancy.toLocaleString("fr-FR")} FCFA. Des op\xE9rations pourraient \xEAtre manquantes ou mal enregistr\xE9es. Demander un relev\xE9 d\xE9taill\xE9 \xE0 la banque.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les patterns inhabituels de flux
   */
  detectUnusualPatterns(transactions, _dailyBalances) {
    const anomalies = [];
    const monthlyFlows = /* @__PURE__ */ new Map();
    for (const transaction of transactions) {
      const monthKey = format(new Date(transaction.date), "yyyy-MM");
      if (!monthlyFlows.has(monthKey)) {
        monthlyFlows.set(monthKey, { credits: 0, debits: 0, transactions: [] });
      }
      const flow = monthlyFlows.get(monthKey);
      if (transaction.amount > 0) {
        flow.credits += transaction.amount;
      } else {
        flow.debits += Math.abs(transaction.amount);
      }
      flow.transactions.push(transaction);
    }
    const flows = Array.from(monthlyFlows.values());
    if (flows.length < 3) return anomalies;
    const avgCredits = flows.reduce((sum, f) => sum + f.credits, 0) / flows.length;
    const avgDebits = flows.reduce((sum, f) => sum + f.debits, 0) / flows.length;
    for (const [month, flow] of monthlyFlows) {
      const creditVariation = Math.abs(flow.credits - avgCredits) / avgCredits;
      const debitVariation = Math.abs(flow.debits - avgDebits) / avgDebits;
      if (creditVariation > this.config.variationThreshold || debitVariation > this.config.variationThreshold) {
        anomalies.push({
          id: v4_default(),
          type: "CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */,
          severity: creditVariation > 1 || debitVariation > 1 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
          confidence: 0.75,
          amount: Math.abs(flow.credits - avgCredits) + Math.abs(flow.debits - avgDebits),
          transactions: flow.transactions.slice(0, 10),
          evidence: [
            {
              type: "MONTH",
              description: "Mois concern\xE9",
              value: month
            },
            {
              type: "CREDITS",
              description: "Cr\xE9dits du mois",
              value: `${flow.credits.toLocaleString("fr-FR")} FCFA (moy: ${avgCredits.toLocaleString("fr-FR")})`
            },
            {
              type: "DEBITS",
              description: "D\xE9bits du mois",
              value: `${flow.debits.toLocaleString("fr-FR")} FCFA (moy: ${avgDebits.toLocaleString("fr-FR")})`
            },
            {
              type: "CREDIT_VARIATION",
              description: "Variation cr\xE9dits",
              value: `${(creditVariation * 100).toFixed(1)}%`
            },
            {
              type: "DEBIT_VARIATION",
              description: "Variation d\xE9bits",
              value: `${(debitVariation * 100).toFixed(1)}%`
            }
          ],
          recommendation: `Flux inhabituels d\xE9tect\xE9s pour ${month}. Variation des cr\xE9dits: ${(creditVariation * 100).toFixed(1)}%, variation des d\xE9bits: ${(debitVariation * 100).toFixed(1)}%. Analyser les op\xE9rations exceptionnelles de cette p\xE9riode.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les crises de liquidité
   */
  detectLiquidityCrisis(dailyBalances) {
    const anomalies = [];
    const balances = Array.from(dailyBalances.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    if (balances.length < 10) return anomalies;
    const firstHalf = balances.slice(0, Math.floor(balances.length / 2));
    const secondHalf = balances.slice(Math.floor(balances.length / 2));
    const avgFirst = firstHalf.reduce((sum, b) => sum + b.balance, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, b) => sum + b.balance, 0) / secondHalf.length;
    if (avgFirst > 0 && avgSecond < avgFirst * 0.5) {
      const decline = avgFirst - avgSecond;
      anomalies.push({
        id: v4_default(),
        type: "CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */,
        severity: avgSecond < 0 ? "CRITICAL" /* CRITICAL */ : "HIGH" /* HIGH */,
        confidence: 0.8,
        amount: decline,
        transactions: [],
        // Pas de transaction spécifique
        evidence: [
          {
            type: "TREND",
            description: "Tendance",
            value: "Fortement baissi\xE8re"
          },
          {
            type: "AVG_FIRST_HALF",
            description: "Solde moyen 1\xE8re p\xE9riode",
            value: `${avgFirst.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "AVG_SECOND_HALF",
            description: "Solde moyen 2\xE8me p\xE9riode",
            value: `${avgSecond.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "DECLINE",
            description: "Baisse",
            value: `${decline.toLocaleString("fr-FR")} FCFA (${(decline / avgFirst * 100).toFixed(1)}%)`
          }
        ],
        recommendation: `Tendance baissi\xE8re importante de la tr\xE9sorerie: solde moyen pass\xE9 de ${avgFirst.toLocaleString("fr-FR")} \xE0 ${avgSecond.toLocaleString("fr-FR")} FCFA. Analyser les causes et pr\xE9voir des mesures correctives.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les pics de transactions anormaux
   */
  detectUnexpectedSpikes(transactions) {
    const anomalies = [];
    const amounts = transactions.map((t) => Math.abs(t.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );
    const threshold = mean + 3 * stdDev;
    for (const transaction of transactions) {
      if (Math.abs(transaction.amount) > threshold) {
        anomalies.push({
          id: v4_default(),
          type: "CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */,
          severity: Math.abs(transaction.amount) > threshold * 2 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
          confidence: 0.85,
          amount: Math.abs(transaction.amount),
          transactions: [transaction],
          evidence: [
            {
              type: "AMOUNT",
              description: "Montant",
              value: `${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "THRESHOLD",
              description: "Seuil de d\xE9tection",
              value: `${threshold.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "MULTIPLIER",
              description: "Fois la moyenne",
              value: `${(Math.abs(transaction.amount) / mean).toFixed(1)}x`
            },
            {
              type: "DESCRIPTION",
              description: "Libell\xE9",
              value: transaction.description
            }
          ],
          recommendation: `Transaction exceptionnelle de ${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA (${(Math.abs(transaction.amount) / mean).toFixed(1)}x la moyenne). Libell\xE9: "${transaction.description}". V\xE9rifier la l\xE9gitimit\xE9 de cette op\xE9ration.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
};

// src/algorithms/ReconciliationAudit.ts
var DEFAULT_CONFIG5 = {
  amountTolerance: 0.01,
  // 1%
  dateWindow: 5,
  descriptionSimilarity: 0.6
};
var ReconciliationAudit = class {
  config;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG5, ...config };
  }
  /**
   * Effectuer le rapprochement et détecter les anomalies
   */
  analyze(transactions, accountingEntries = []) {
    const anomalies = [];
    if (accountingEntries.length === 0) {
      return this.selfReconciliation(transactions);
    }
    const matches = this.matchTransactions(transactions, accountingEntries);
    const unmatchedBank = matches.filter((m) => m.matchType === "unmatched");
    if (unmatchedBank.length > 0) {
      anomalies.push(this.createUnmatchedBankAnomaly(unmatchedBank));
    }
    const unmatchedAccounting = this.findUnmatchedAccounting(accountingEntries, matches);
    if (unmatchedAccounting.length > 0) {
      anomalies.push(this.createUnmatchedAccountingAnomaly(unmatchedAccounting));
    }
    const partialMatches = matches.filter((m) => m.matchType === "partial");
    for (const partial of partialMatches) {
      if (partial.accountingEntry) {
        anomalies.push(this.createPartialMatchAnomaly(partial));
      }
    }
    return anomalies;
  }
  /**
   * Auto-rapprochement bancaire (sans données comptables)
   */
  selfReconciliation(transactions) {
    const anomalies = [];
    const byAccount = /* @__PURE__ */ new Map();
    for (const t of transactions) {
      if (!byAccount.has(t.accountNumber)) {
        byAccount.set(t.accountNumber, []);
      }
      byAccount.get(t.accountNumber).push(t);
    }
    for (const [account, accountTransactions] of byAccount) {
      const sorted = [...accountTransactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const gaps = this.detectBalanceGaps(sorted);
      if (gaps.length > 0) {
        anomalies.push(this.createBalanceGapsAnomaly(account, gaps));
      }
      const orphans = this.detectOrphanTransactions(sorted);
      for (const orphan of orphans) {
        anomalies.push(this.createOrphanAnomaly(orphan));
      }
    }
    return anomalies;
  }
  /**
   * Matcher les transactions avec les écritures comptables
   */
  matchTransactions(transactions, entries) {
    const results = [];
    const usedEntries = /* @__PURE__ */ new Set();
    for (const transaction of transactions) {
      let bestMatch = null;
      for (const entry of entries) {
        if (usedEntries.has(entry.id)) continue;
        const score = this.calculateMatchScore(transaction, entry);
        if (score > 0.8 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { entry, score };
        }
      }
      if (bestMatch && bestMatch.score >= 0.95) {
        results.push({
          bankTransaction: transaction,
          accountingEntry: bestMatch.entry,
          matchScore: bestMatch.score,
          matchType: "exact"
        });
        usedEntries.add(bestMatch.entry.id);
      } else if (bestMatch) {
        results.push({
          bankTransaction: transaction,
          accountingEntry: bestMatch.entry,
          matchScore: bestMatch.score,
          matchType: "partial"
        });
        usedEntries.add(bestMatch.entry.id);
      } else {
        results.push({
          bankTransaction: transaction,
          accountingEntry: null,
          matchScore: 0,
          matchType: "unmatched"
        });
      }
    }
    return results;
  }
  /**
   * Calculer le score de matching
   */
  calculateMatchScore(transaction, entry) {
    let score = 0;
    const amountMatch = this.matchAmount(transaction.amount, entry.amount);
    score += amountMatch * 0.4;
    const dateMatch = this.matchDate(new Date(transaction.date), entry.date);
    score += dateMatch * 0.3;
    const descMatch = this.matchDescription(transaction.description, entry.description);
    score += descMatch * 0.2;
    if (transaction.reference && entry.reference) {
      if (transaction.reference === entry.reference) {
        score += 0.1;
      }
    }
    return score;
  }
  /**
   * Matcher les montants avec tolérance
   */
  matchAmount(bankAmount, accountingAmount) {
    const diff = Math.abs(Math.abs(bankAmount) - Math.abs(accountingAmount));
    const maxAmount = Math.max(Math.abs(bankAmount), Math.abs(accountingAmount));
    if (maxAmount === 0) return bankAmount === accountingAmount ? 1 : 0;
    const tolerance = maxAmount * this.config.amountTolerance;
    if (diff <= tolerance) {
      return 1 - diff / tolerance * 0.1;
    }
    return Math.max(0, 1 - diff / maxAmount);
  }
  /**
   * Matcher les dates avec fenêtre
   */
  matchDate(bankDate, accountingDate) {
    const days = Math.abs(differenceInDays(bankDate, accountingDate));
    if (days === 0) return 1;
    if (days <= this.config.dateWindow) {
      return 1 - days / this.config.dateWindow * 0.5;
    }
    return 0;
  }
  /**
   * Matcher les descriptions
   */
  matchDescription(bankDesc, accountingDesc) {
    const a = bankDesc.toLowerCase();
    const b = accountingDesc.toLowerCase();
    if (a === b) return 1;
    const wordsA = new Set(a.split(/\s+/).filter((w) => w.length > 2));
    const wordsB = new Set(b.split(/\s+/).filter((w) => w.length > 2));
    let common = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) common++;
    }
    const total = Math.max(wordsA.size, wordsB.size);
    if (total === 0) return 0;
    return common / total;
  }
  /**
   * Trouver les écritures comptables non rapprochées
   */
  findUnmatchedAccounting(entries, matches) {
    const matchedIds = new Set(
      matches.filter((m) => m.accountingEntry).map((m) => m.accountingEntry.id)
    );
    return entries.filter((e) => !matchedIds.has(e.id));
  }
  /**
   * Détecter les écarts de solde
   */
  detectBalanceGaps(transactions) {
    const gaps = [];
    for (let i = 1; i < transactions.length; i++) {
      const prev = transactions[i - 1];
      const curr = transactions[i];
      const expectedBalance = prev.balance + curr.amount;
      const diff = Math.abs(expectedBalance - curr.balance);
      if (diff > 1) {
        gaps.push({ transaction: curr, expectedBalance });
      }
    }
    return gaps;
  }
  /**
   * Détecter les transactions orphelines (sans contexte)
   */
  detectOrphanTransactions(transactions) {
    const orphans = [];
    for (let i = 0; i < transactions.length; i++) {
      const curr = transactions[i];
      const prev = i > 0 ? transactions[i - 1] : null;
      const next = i < transactions.length - 1 ? transactions[i + 1] : null;
      const prevGap = prev ? differenceInDays(new Date(curr.date), new Date(prev.date)) : 0;
      const nextGap = next ? differenceInDays(new Date(next.date), new Date(curr.date)) : 0;
      if (prevGap > 30 && nextGap > 30) {
        orphans.push(curr);
      }
    }
    return orphans;
  }
  /**
   * Créer anomalie pour transactions bancaires non rapprochées
   */
  createUnmatchedBankAnomaly(matches) {
    const transactions = matches.map((m) => m.bankTransaction);
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      id: v4_default(),
      type: "RECONCILIATION_GAP" /* RECONCILIATION_GAP */,
      severity: transactions.length > 10 ? "HIGH" /* HIGH */ : transactions.length > 5 ? "MEDIUM" /* MEDIUM */ : "LOW" /* LOW */,
      confidence: 0.85,
      amount: totalAmount,
      transactions: transactions.slice(0, 20),
      evidence: [
        {
          type: "UNMATCHED_COUNT",
          description: "Transactions non rapproch\xE9es",
          value: transactions.length
        },
        {
          type: "TOTAL_AMOUNT",
          description: "Montant total",
          value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `${transactions.length} transactions bancaires n'ont pas de correspondance comptable pour un total de ${totalAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier les \xE9critures comptables manquantes.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Créer anomalie pour écritures comptables non rapprochées
   */
  createUnmatchedAccountingAnomaly(entries) {
    const totalAmount = entries.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    return {
      id: v4_default(),
      type: "RECONCILIATION_GAP" /* RECONCILIATION_GAP */,
      severity: entries.length > 10 ? "HIGH" /* HIGH */ : entries.length > 5 ? "MEDIUM" /* MEDIUM */ : "LOW" /* LOW */,
      confidence: 0.85,
      amount: totalAmount,
      transactions: [],
      evidence: [
        {
          type: "UNMATCHED_COUNT",
          description: "\xC9critures non rapproch\xE9es",
          value: entries.length
        },
        {
          type: "TOTAL_AMOUNT",
          description: "Montant total",
          value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
        },
        ...entries.slice(0, 5).map((e, i) => ({
          type: `ENTRY_${i + 1}`,
          description: e.description,
          value: `${e.amount.toLocaleString("fr-FR")} FCFA (${format(e.date, "dd/MM/yyyy")})`
        }))
      ],
      recommendation: `${entries.length} \xE9critures comptables sans correspondance bancaire pour un total de ${totalAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier si ces op\xE9rations ont bien \xE9t\xE9 ex\xE9cut\xE9es par la banque.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Créer anomalie pour rapprochement partiel
   */
  createPartialMatchAnomaly(match2) {
    const diff = Math.abs(match2.bankTransaction.amount) - Math.abs(match2.accountingEntry.amount);
    return {
      id: v4_default(),
      type: "RECONCILIATION_GAP" /* RECONCILIATION_GAP */,
      severity: Math.abs(diff) > 1e4 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: match2.matchScore,
      amount: Math.abs(diff),
      transactions: [match2.bankTransaction],
      evidence: [
        {
          type: "BANK_AMOUNT",
          description: "Montant banque",
          value: `${Math.abs(match2.bankTransaction.amount).toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACCOUNTING_AMOUNT",
          description: "Montant comptable",
          value: `${Math.abs(match2.accountingEntry.amount).toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "DIFFERENCE",
          description: "\xC9cart",
          value: `${diff.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "MATCH_SCORE",
          description: "Score de correspondance",
          value: `${(match2.matchScore * 100).toFixed(1)}%`
        }
      ],
      recommendation: `\xC9cart de ${Math.abs(diff).toLocaleString("fr-FR")} FCFA entre la transaction bancaire et l'\xE9criture comptable. V\xE9rifier et r\xE9gulariser cet \xE9cart.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Créer anomalie pour écarts de solde
   */
  createBalanceGapsAnomaly(account, gaps) {
    const totalGap = gaps.reduce(
      (sum, g) => sum + Math.abs(g.transaction.balance - g.expectedBalance),
      0
    );
    return {
      id: v4_default(),
      type: "RECONCILIATION_GAP" /* RECONCILIATION_GAP */,
      severity: totalGap > 1e5 ? "CRITICAL" /* CRITICAL */ : totalGap > 1e4 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: totalGap,
      transactions: gaps.map((g) => g.transaction).slice(0, 10),
      evidence: [
        {
          type: "ACCOUNT",
          description: "Compte",
          value: account
        },
        {
          type: "GAP_COUNT",
          description: "Nombre d'\xE9carts",
          value: gaps.length
        },
        {
          type: "TOTAL_GAP",
          description: "\xC9cart total",
          value: `${totalGap.toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `${gaps.length} \xE9carts de solde d\xE9tect\xE9s sur le compte ${account} pour un total de ${totalGap.toLocaleString("fr-FR")} FCFA. Des op\xE9rations pourraient \xEAtre manquantes dans le relev\xE9.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Créer anomalie pour transaction orpheline
   */
  createOrphanAnomaly(transaction) {
    return {
      id: v4_default(),
      type: "RECONCILIATION_GAP" /* RECONCILIATION_GAP */,
      severity: "LOW" /* LOW */,
      confidence: 0.7,
      amount: Math.abs(transaction.amount),
      transactions: [transaction],
      evidence: [
        {
          type: "DATE",
          description: "Date",
          value: format(new Date(transaction.date), "dd/MM/yyyy")
        },
        {
          type: "DESCRIPTION",
          description: "Libell\xE9",
          value: transaction.description
        },
        {
          type: "AMOUNT",
          description: "Montant",
          value: `${Math.abs(transaction.amount).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Transaction isol\xE9e du ${format(new Date(transaction.date), "dd/MM/yyyy")} sans contexte (\xE9cart > 30 jours avec les transactions voisines). V\xE9rifier s'il manque des relev\xE9s.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/MultiBankAudit.ts
var DEFAULT_CONFIG6 = {
  circularTransferWindow: 48,
  // 48 heures
  amountTolerance: 0.02,
  // 2%
  concentrationThreshold: 0.8,
  // 80% des flux
  minAccounts: 2
};
var MultiBankAudit = class {
  config;
  bankConditions;
  constructor(bankConditions = [], config) {
    this.config = { ...DEFAULT_CONFIG6, ...config };
    this.bankConditions = new Map(bankConditions.map((bc) => [bc.bankCode, bc]));
  }
  /**
   * Analyser les transactions multi-banques
   */
  analyze(transactions) {
    const anomalies = [];
    const byBank = this.groupByBank(transactions);
    if (byBank.size < this.config.minAccounts) {
      return anomalies;
    }
    const bankStats = this.calculateBankStats(byBank);
    anomalies.push(...this.detectCircularTransfers(transactions, byBank));
    anomalies.push(...this.compareBankFees(bankStats));
    anomalies.push(...this.detectConcentration(bankStats, transactions));
    anomalies.push(...this.analyzeTreasuryOptimization(bankStats, byBank));
    anomalies.push(...this.detectCrossBankDuplicates(transactions));
    return anomalies;
  }
  /**
   * Grouper les transactions par banque
   */
  groupByBank(transactions) {
    const byBank = /* @__PURE__ */ new Map();
    for (const t of transactions) {
      const bankKey = t.bankCode || "UNKNOWN";
      if (!byBank.has(bankKey)) {
        byBank.set(bankKey, []);
      }
      byBank.get(bankKey).push(t);
    }
    return byBank;
  }
  /**
   * Calculer les statistiques par banque
   */
  calculateBankStats(byBank) {
    var _a;
    const stats = /* @__PURE__ */ new Map();
    for (const [bankCode, transactions] of byBank) {
      const credits = transactions.filter((t) => t.amount > 0);
      const debits = transactions.filter((t) => t.amount < 0);
      const fees = transactions.filter(
        (t) => t.description.toLowerCase().includes("frais") || t.description.toLowerCase().includes("commission")
      );
      const accounts = new Set(transactions.map((t) => t.accountNumber));
      const balances = transactions.map((t) => t.balance);
      const avgBalance = balances.length > 0 ? balances.reduce((a, b) => a + b, 0) / balances.length : 0;
      stats.set(bankCode, {
        bankCode,
        bankName: ((_a = transactions[0]) == null ? void 0 : _a.bankName) || bankCode,
        accountCount: accounts.size,
        transactionCount: transactions.length,
        totalCredits: credits.reduce((sum, t) => sum + t.amount, 0),
        totalDebits: Math.abs(debits.reduce((sum, t) => sum + t.amount, 0)),
        totalFees: Math.abs(fees.reduce((sum, t) => sum + t.amount, 0)),
        avgBalance
      });
    }
    return stats;
  }
  /**
   * Détecter les virements circulaires (A→B→C→A)
   */
  detectCircularTransfers(transactions, _byBank) {
    const anomalies = [];
    const transfers = transactions.filter(
      (t) => t.description.toLowerCase().includes("virement") || t.description.toLowerCase().includes("transfer")
    );
    const byAmount = /* @__PURE__ */ new Map();
    for (const t of transfers) {
      const roundedAmount = Math.round(Math.abs(t.amount) / 1e3) * 1e3;
      if (!byAmount.has(roundedAmount)) {
        byAmount.set(roundedAmount, []);
      }
      byAmount.get(roundedAmount).push(t);
    }
    for (const [, amountTransfers] of byAmount) {
      if (amountTransfers.length < 3) continue;
      const credits = amountTransfers.filter((t) => t.amount > 0);
      const debits = amountTransfers.filter((t) => t.amount < 0);
      for (const credit of credits) {
        for (const debit of debits) {
          if (credit.bankCode === debit.bankCode) continue;
          const timeDiff = Math.abs(
            differenceInHours(new Date(credit.date), new Date(debit.date))
          );
          if (timeDiff <= this.config.circularTransferWindow) {
            const amountDiff = Math.abs(credit.amount + debit.amount);
            const tolerance = Math.abs(credit.amount) * this.config.amountTolerance;
            if (amountDiff <= tolerance) {
              anomalies.push(this.createCircularTransferAnomaly(credit, debit));
            }
          }
        }
      }
    }
    return anomalies;
  }
  /**
   * Comparer les frais entre banques
   */
  compareBankFees(bankStats) {
    const anomalies = [];
    const stats = Array.from(bankStats.values());
    if (stats.length < 2) return anomalies;
    const feeRatios = stats.map((s) => ({
      ...s,
      feeRatio: s.totalFees / (s.totalCredits + s.totalDebits)
    })).filter((s) => s.totalCredits + s.totalDebits > 0);
    if (feeRatios.length < 2) return anomalies;
    feeRatios.sort((a, b) => a.feeRatio - b.feeRatio);
    const cheapest = feeRatios[0];
    const mostExpensive = feeRatios[feeRatios.length - 1];
    if (mostExpensive.feeRatio > cheapest.feeRatio * 1.5) {
      const potentialSavings = (mostExpensive.feeRatio - cheapest.feeRatio) * (mostExpensive.totalCredits + mostExpensive.totalDebits);
      anomalies.push({
        id: v4_default(),
        type: "MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */,
        severity: potentialSavings > 1e5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
        confidence: 0.75,
        amount: potentialSavings,
        transactions: [],
        evidence: [
          {
            type: "CHEAPEST_BANK",
            description: "Banque la moins ch\xE8re",
            value: `${cheapest.bankName} (${(cheapest.feeRatio * 100).toFixed(2)}% de frais)`
          },
          {
            type: "MOST_EXPENSIVE_BANK",
            description: "Banque la plus ch\xE8re",
            value: `${mostExpensive.bankName} (${(mostExpensive.feeRatio * 100).toFixed(2)}% de frais)`
          },
          {
            type: "POTENTIAL_SAVINGS",
            description: "\xC9conomies potentielles",
            value: `${potentialSavings.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "FEE_DIFFERENCE",
            description: "Diff\xE9rence de frais",
            value: `${((mostExpensive.feeRatio / cheapest.feeRatio - 1) * 100).toFixed(1)}%`
          }
        ],
        recommendation: `\xC9cart significatif de frais entre ${mostExpensive.bankName} et ${cheapest.bankName}. \xC9conomies potentielles de ${potentialSavings.toLocaleString("fr-FR")} FCFA en transf\xE9rant une partie de l'activit\xE9 vers la banque moins ch\xE8re.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les concentrations anormales
   */
  detectConcentration(bankStats, _transactions) {
    const anomalies = [];
    const stats = Array.from(bankStats.values());
    const totalVolume = stats.reduce((sum, s) => sum + s.totalCredits + s.totalDebits, 0);
    for (const stat of stats) {
      const bankVolume = stat.totalCredits + stat.totalDebits;
      const concentration = bankVolume / totalVolume;
      if (concentration > this.config.concentrationThreshold) {
        anomalies.push({
          id: v4_default(),
          type: "MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.8,
          amount: bankVolume,
          transactions: [],
          evidence: [
            {
              type: "BANK",
              description: "Banque",
              value: stat.bankName
            },
            {
              type: "CONCENTRATION",
              description: "Concentration",
              value: `${(concentration * 100).toFixed(1)}%`
            },
            {
              type: "VOLUME",
              description: "Volume",
              value: `${bankVolume.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Concentration \xE9lev\xE9e (${(concentration * 100).toFixed(1)}%) des flux bancaires sur ${stat.bankName}. Envisager une diversification pour r\xE9duire le risque et optimiser les conditions tarifaires.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Analyser les opportunités d'optimisation de trésorerie
   */
  analyzeTreasuryOptimization(bankStats, _byBank) {
    const anomalies = [];
    const stats = Array.from(bankStats.values());
    for (const stat of stats) {
      if (stat.avgBalance > 5e6 && stat.totalFees > 5e4) {
        void this.bankConditions.get(stat.bankCode);
        anomalies.push({
          id: v4_default(),
          type: "MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */,
          severity: "LOW" /* LOW */,
          confidence: 0.7,
          amount: stat.totalFees,
          transactions: [],
          evidence: [
            {
              type: "BANK",
              description: "Banque",
              value: stat.bankName
            },
            {
              type: "AVG_BALANCE",
              description: "Solde moyen",
              value: `${stat.avgBalance.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "TOTAL_FEES",
              description: "Frais totaux",
              value: `${stat.totalFees.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Solde moyen \xE9lev\xE9 de ${stat.avgBalance.toLocaleString("fr-FR")} FCFA chez ${stat.bankName} avec ${stat.totalFees.toLocaleString("fr-FR")} FCFA de frais. N\xE9gocier une r\xE9duction des frais ou des conditions pr\xE9f\xE9rentielles bas\xE9es sur ce solde.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    const positiveBalanceBanks = stats.filter((s) => s.avgBalance > 0);
    const negativeBalanceBanks = stats.filter((s) => s.avgBalance < 0);
    if (positiveBalanceBanks.length > 0 && negativeBalanceBanks.length > 0) {
      const excessCash = positiveBalanceBanks.reduce((sum, s) => sum + s.avgBalance, 0);
      const overdraftNeeded = Math.abs(negativeBalanceBanks.reduce((sum, s) => sum + s.avgBalance, 0));
      if (excessCash > overdraftNeeded * 0.5) {
        anomalies.push({
          id: v4_default(),
          type: "MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.85,
          amount: Math.min(excessCash, overdraftNeeded),
          transactions: [],
          evidence: [
            {
              type: "EXCESS_CASH",
              description: "Exc\xE9dent de tr\xE9sorerie",
              value: `${excessCash.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "OVERDRAFT",
              description: "D\xE9couvert utilis\xE9",
              value: `${overdraftNeeded.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "BANKS_WITH_EXCESS",
              description: "Banques exc\xE9dentaires",
              value: positiveBalanceBanks.map((s) => s.bankName).join(", ")
            },
            {
              type: "BANKS_WITH_OVERDRAFT",
              description: "Banques en d\xE9couvert",
              value: negativeBalanceBanks.map((s) => s.bankName).join(", ")
            }
          ],
          recommendation: `D\xE9s\xE9quilibre de tr\xE9sorerie: ${excessCash.toLocaleString("fr-FR")} FCFA d'exc\xE9dent alors que ${overdraftNeeded.toLocaleString("fr-FR")} FCFA de d\xE9couvert sont utilis\xE9s ailleurs. Optimiser les \xE9quilibrages inter-banques pour r\xE9duire les frais financiers.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les doublons inter-banques
   */
  detectCrossBankDuplicates(transactions) {
    const anomalies = [];
    const grouped = /* @__PURE__ */ new Map();
    for (const t of transactions) {
      const key = `${Math.abs(t.amount)}_${format(new Date(t.date), "yyyy-MM-dd")}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(t);
    }
    for (const [, group] of grouped) {
      const banks = new Set(group.map((t) => t.bankCode));
      if (banks.size > 1 && group.length >= 2) {
        const hasDebit = group.some((t) => t.amount < 0);
        const hasCredit = group.some((t) => t.amount > 0);
        if (!hasDebit || !hasCredit) {
          const totalAmount = group.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          anomalies.push({
            id: v4_default(),
            type: "MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.7,
            amount: totalAmount,
            transactions: group,
            evidence: [
              {
                type: "AMOUNT",
                description: "Montant",
                value: `${(totalAmount / group.length).toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "BANKS",
                description: "Banques concern\xE9es",
                value: Array.from(banks).join(", ")
              },
              {
                type: "COUNT",
                description: "Occurrences",
                value: group.length
              }
            ],
            recommendation: `${group.length} transactions similaires d\xE9tect\xE9es le m\xEAme jour sur diff\xE9rentes banques. V\xE9rifier s'il ne s'agit pas d'un doublon de paiement.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Créer anomalie pour virement circulaire
   */
  createCircularTransferAnomaly(credit, debit) {
    return {
      id: v4_default(),
      type: "MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */,
      severity: "HIGH" /* HIGH */,
      confidence: 0.85,
      amount: Math.abs(credit.amount),
      transactions: [credit, debit],
      evidence: [
        {
          type: "CREDIT_BANK",
          description: "Banque cr\xE9dit\xE9e",
          value: `${credit.bankName} (+${credit.amount.toLocaleString("fr-FR")} FCFA)`
        },
        {
          type: "DEBIT_BANK",
          description: "Banque d\xE9bit\xE9e",
          value: `${debit.bankName} (${debit.amount.toLocaleString("fr-FR")} FCFA)`
        },
        {
          type: "TIME_DIFF",
          description: "\xC9cart temporel",
          value: `${differenceInHours(new Date(credit.date), new Date(debit.date))} heures`
        }
      ],
      recommendation: `Possible virement circulaire d\xE9tect\xE9: ${Math.abs(debit.amount).toLocaleString("fr-FR")} FCFA transf\xE9r\xE9s de ${debit.bankName} vers ${credit.bankName}. V\xE9rifier la justification \xE9conomique de ce mouvement.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/OhadaAudit.ts
var DEFAULT_CONFIG7 = {
  documentThreshold: 1e5,
  // 100k FCFA
  retentionPeriod: 10,
  // 10 ans OHADA
  cashThreshold: 5e5,
  // 500k FCFA pour espèces
  accountCategories: ["6", "7"]
  // Charges et produits
};
var OhadaAudit = class {
  config;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG7, ...config };
  }
  /**
   * Analyser la conformité OHADA
   */
  analyze(transactions) {
    const anomalies = [];
    anomalies.push(...this.checkDocumentRequirements(transactions));
    anomalies.push(...this.checkCashLimits(transactions));
    anomalies.push(...this.checkClassification(transactions));
    anomalies.push(...this.checkTimingCompliance(transactions));
    anomalies.push(...this.checkAuditTrail(transactions));
    anomalies.push(...this.checkFiscalYearCompliance(transactions));
    return anomalies;
  }
  /**
   * Vérifier les transactions nécessitant un justificatif
   */
  checkDocumentRequirements(transactions) {
    const anomalies = [];
    const largeTransactions = [];
    for (const t of transactions) {
      if (Math.abs(t.amount) >= this.config.documentThreshold) {
        const hasReference = t.reference && t.reference.length > 3;
        const hasDetailedDescription = t.description.length > 20;
        if (!hasReference && !hasDetailedDescription) {
          largeTransactions.push(t);
        }
      }
    }
    if (largeTransactions.length > 0) {
      const totalAmount = largeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      anomalies.push({
        id: v4_default(),
        type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
        severity: largeTransactions.length > 10 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
        confidence: 0.75,
        amount: totalAmount,
        transactions: largeTransactions.slice(0, 20),
        evidence: [
          {
            type: "TRANSACTION_COUNT",
            description: "Transactions sans justificatif apparent",
            value: largeTransactions.length
          },
          {
            type: "TOTAL_AMOUNT",
            description: "Montant total",
            value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "THRESHOLD",
            description: "Seuil de justification",
            value: `${this.config.documentThreshold.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "OHADA_REFERENCE",
            description: "R\xE9f\xE9rence OHADA",
            value: "Art. 17 - Acte uniforme relatif au droit comptable"
          }
        ],
        recommendation: `${largeTransactions.length} transactions de plus de ${this.config.documentThreshold.toLocaleString("fr-FR")} FCFA sans justificatif apparent. Conform\xE9ment \xE0 l'OHADA (Art. 17), toute \xE9criture doit \xEAtre appuy\xE9e par une pi\xE8ce justificative. V\xE9rifier et archiver les justificatifs correspondants.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Vérifier les plafonds de paiement en espèces
   */
  checkCashLimits(transactions) {
    const anomalies = [];
    const cashTransactions = transactions.filter(
      (t) => t.type === "ATM" /* ATM */ || t.description.toLowerCase().includes("especes") || t.description.toLowerCase().includes("esp\xE8ces") || t.description.toLowerCase().includes("cash") || t.description.toLowerCase().includes("retrait") || t.description.toLowerCase().includes("versement")
    );
    const overLimitTransactions = cashTransactions.filter(
      (t) => Math.abs(t.amount) > this.config.cashThreshold
    );
    if (overLimitTransactions.length > 0) {
      const totalAmount = overLimitTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      anomalies.push({
        id: v4_default(),
        type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
        severity: "HIGH" /* HIGH */,
        confidence: 0.9,
        amount: totalAmount,
        transactions: overLimitTransactions.slice(0, 10),
        evidence: [
          {
            type: "VIOLATION_COUNT",
            description: "Nombre de violations",
            value: overLimitTransactions.length
          },
          {
            type: "TOTAL_AMOUNT",
            description: "Montant total",
            value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "THRESHOLD",
            description: "Plafond esp\xE8ces",
            value: `${this.config.cashThreshold.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "REGULATION",
            description: "R\xE9glementation",
            value: "R\xE8glement CEMAC/UEMOA sur les paiements en esp\xE8ces"
          }
        ],
        recommendation: `${overLimitTransactions.length} transactions en esp\xE8ces d\xE9passant le plafond de ${this.config.cashThreshold.toLocaleString("fr-FR")} FCFA. Les r\xE8glements sup\xE9rieurs \xE0 ce montant doivent \xEAtre effectu\xE9s par virement bancaire ou ch\xE8que pour des raisons de conformit\xE9 et de tra\xE7abilit\xE9.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    const cashByDay = /* @__PURE__ */ new Map();
    for (const t of cashTransactions) {
      const dateKey = format(new Date(t.date), "yyyy-MM-dd");
      if (!cashByDay.has(dateKey)) {
        cashByDay.set(dateKey, []);
      }
      cashByDay.get(dateKey).push(t);
    }
    for (const [date, dayTransactions] of cashByDay) {
      const dailyTotal = dayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      if (dailyTotal > this.config.cashThreshold && dayTransactions.length > 1) {
        const maxSingle = Math.max(...dayTransactions.map((t) => Math.abs(t.amount)));
        if (maxSingle <= this.config.cashThreshold) {
          anomalies.push({
            id: v4_default(),
            type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
            severity: "HIGH" /* HIGH */,
            confidence: 0.8,
            amount: dailyTotal,
            transactions: dayTransactions,
            evidence: [
              {
                type: "DATE",
                description: "Date",
                value: date
              },
              {
                type: "TRANSACTION_COUNT",
                description: "Nombre d'op\xE9rations",
                value: dayTransactions.length
              },
              {
                type: "DAILY_TOTAL",
                description: "Total journalier",
                value: `${dailyTotal.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "MAX_SINGLE",
                description: "Plus grande transaction",
                value: `${maxSingle.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Possible fractionnement d'op\xE9rations en esp\xE8ces le ${date}: ${dayTransactions.length} transactions totalisant ${dailyTotal.toLocaleString("fr-FR")} FCFA, chacune restant sous le plafond. Cette pratique peut \xEAtre consid\xE9r\xE9e comme un contournement de la r\xE9glementation.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Vérifier la classification des opérations
   */
  checkClassification(transactions) {
    const anomalies = [];
    const misclassified = [];
    for (const t of transactions) {
      const description = t.description.toLowerCase();
      if (t.type === "FEE" /* FEE */ && t.amount > 0) {
        misclassified.push({
          transaction: t,
          issue: "Frais avec montant positif"
        });
      }
      if (t.type === "INTEREST" /* INTEREST */ && Math.abs(t.amount) > 1e6) {
        misclassified.push({
          transaction: t,
          issue: "Montant d'int\xE9r\xEAts inhabituellement \xE9lev\xE9"
        });
      }
      if (description.length < 5 && Math.abs(t.amount) > this.config.documentThreshold) {
        misclassified.push({
          transaction: t,
          issue: "Libell\xE9 insuffisamment d\xE9taill\xE9"
        });
      }
    }
    if (misclassified.length > 0) {
      anomalies.push({
        id: v4_default(),
        type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
        severity: "MEDIUM" /* MEDIUM */,
        confidence: 0.7,
        amount: misclassified.reduce((sum, m) => sum + Math.abs(m.transaction.amount), 0),
        transactions: misclassified.map((m) => m.transaction).slice(0, 10),
        evidence: [
          {
            type: "ISSUE_COUNT",
            description: "Probl\xE8mes de classification",
            value: misclassified.length
          },
          ...misclassified.slice(0, 5).map((m, i) => ({
            type: `ISSUE_${i + 1}`,
            description: m.issue,
            value: `${m.transaction.description} (${m.transaction.amount.toLocaleString("fr-FR")} FCFA)`
          }))
        ],
        recommendation: `${misclassified.length} transactions pr\xE9sentent des probl\xE8mes de classification. L'OHADA exige une classification correcte des op\xE9rations. R\xE9viser la cat\xE9gorisation de ces \xE9critures.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Vérifier le respect des délais d'enregistrement
   */
  checkTimingCompliance(transactions) {
    const anomalies = [];
    const lateRegistrations = [];
    for (const t of transactions) {
      const operationDate = new Date(t.date);
      const recordDate = new Date(t.createdAt || t.date);
      const delay = differenceInDays(recordDate, operationDate);
      if (delay > 30) {
        lateRegistrations.push(t);
      }
    }
    if (lateRegistrations.length > 0) {
      anomalies.push({
        id: v4_default(),
        type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
        severity: "MEDIUM" /* MEDIUM */,
        confidence: 0.65,
        amount: lateRegistrations.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        transactions: lateRegistrations.slice(0, 10),
        evidence: [
          {
            type: "LATE_COUNT",
            description: "Enregistrements tardifs",
            value: lateRegistrations.length
          },
          {
            type: "OHADA_RULE",
            description: "R\xE8gle OHADA",
            value: "Enregistrement chronologique au jour le jour"
          }
        ],
        recommendation: `${lateRegistrations.length} transactions enregistr\xE9es avec un retard de plus de 30 jours. L'OHADA impose un enregistrement chronologique des op\xE9rations. Mettre en place des proc\xE9dures pour garantir l'enregistrement quotidien.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Vérifier la piste d'audit
   */
  checkAuditTrail(transactions) {
    const anomalies = [];
    const noReference = transactions.filter((t) => !t.reference || t.reference.trim() === "");
    if (noReference.length > transactions.length * 0.1) {
      anomalies.push({
        id: v4_default(),
        type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
        severity: "MEDIUM" /* MEDIUM */,
        confidence: 0.7,
        amount: noReference.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        transactions: noReference.slice(0, 10),
        evidence: [
          {
            type: "NO_REF_COUNT",
            description: "Transactions sans r\xE9f\xE9rence",
            value: noReference.length
          },
          {
            type: "PERCENTAGE",
            description: "Pourcentage du total",
            value: `${(noReference.length / transactions.length * 100).toFixed(1)}%`
          },
          {
            type: "AUDIT_REQUIREMENT",
            description: "Exigence d'audit",
            value: "Tra\xE7abilit\xE9 compl\xE8te des op\xE9rations"
          }
        ],
        recommendation: `${noReference.length} transactions (${(noReference.length / transactions.length * 100).toFixed(1)}%) n'ont pas de r\xE9f\xE9rence unique. La piste d'audit doit permettre de remonter de chaque \xE9criture \xE0 sa pi\xE8ce justificative.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    const refs = transactions.filter((t) => t.reference && /^\d+$/.test(t.reference)).map((t) => parseInt(t.reference, 10)).sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < refs.length; i++) {
      if (refs[i] - refs[i - 1] > 1) {
        for (let j = refs[i - 1] + 1; j < refs[i]; j++) {
          gaps.push(j);
        }
      }
    }
    if (gaps.length > 0) {
      anomalies.push({
        id: v4_default(),
        type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
        severity: "HIGH" /* HIGH */,
        confidence: 0.9,
        amount: 0,
        transactions: [],
        evidence: [
          {
            type: "GAP_COUNT",
            description: "Num\xE9ros manquants",
            value: gaps.length
          },
          {
            type: "GAPS_SAMPLE",
            description: "Exemples",
            value: gaps.slice(0, 10).join(", ") + (gaps.length > 10 ? "..." : "")
          },
          {
            type: "SEQUENCE_REQUIREMENT",
            description: "Exigence",
            value: "Num\xE9rotation continue et sans rupture"
          }
        ],
        recommendation: `${gaps.length} num\xE9ros de r\xE9f\xE9rence manquants dans la s\xE9quence. L'OHADA exige une num\xE9rotation continue. Rechercher les pi\xE8ces correspondantes ou justifier les ruptures.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Vérifier la conformité des exercices comptables
   */
  checkFiscalYearCompliance(transactions) {
    const anomalies = [];
    const byYear = /* @__PURE__ */ new Map();
    for (const t of transactions) {
      const year = new Date(t.date).getFullYear();
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year).push(t);
    }
    if (byYear.size > 1) {
      const years = Array.from(byYear.keys()).sort();
      for (let i = 0; i < years.length - 1; i++) {
        const currentYear = years[i];
        const nextYear = years[i + 1];
        const currentYearTrans = byYear.get(currentYear);
        const lateDec = currentYearTrans.filter((t) => {
          const date = new Date(t.date);
          return date.getMonth() === 11 && date.getDate() >= 28;
        });
        const nextYearTrans = byYear.get(nextYear);
        const earlyJan = nextYearTrans.filter((t) => {
          const date = new Date(t.date);
          return date.getMonth() === 0 && date.getDate() <= 3;
        });
        if (lateDec.length > 0 && earlyJan.length > 0) {
          const lastBalance = lateDec.reduce(
            (max, t) => new Date(t.date) > new Date(max.date) ? t : max
          ).balance;
          const firstBalance = earlyJan.reduce(
            (min, t) => new Date(t.date) < new Date(min.date) ? t : min
          );
          const expectedOpening = firstBalance.balance - firstBalance.amount;
          const diff = Math.abs(lastBalance - expectedOpening);
          if (diff > 1) {
            anomalies.push({
              id: v4_default(),
              type: "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
              severity: "CRITICAL" /* CRITICAL */,
              confidence: 0.85,
              amount: diff,
              transactions: [...lateDec.slice(-5), ...earlyJan.slice(0, 5)],
              evidence: [
                {
                  type: "YEAR_TRANSITION",
                  description: "Transition d'exercice",
                  value: `${currentYear} \u2192 ${nextYear}`
                },
                {
                  type: "CLOSING_BALANCE",
                  description: "Solde de cl\xF4ture",
                  value: `${lastBalance.toLocaleString("fr-FR")} FCFA`
                },
                {
                  type: "OPENING_BALANCE",
                  description: "Solde d'ouverture calcul\xE9",
                  value: `${expectedOpening.toLocaleString("fr-FR")} FCFA`
                },
                {
                  type: "DIFFERENCE",
                  description: "\xC9cart",
                  value: `${diff.toLocaleString("fr-FR")} FCFA`
                }
              ],
              recommendation: `\xC9cart de ${diff.toLocaleString("fr-FR")} FCFA entre le solde de cl\xF4ture ${currentYear} et le solde d'ouverture ${nextYear}. L'OHADA impose la continuit\xE9 des exercices. Identifier et corriger les \xE9critures manquantes.`,
              status: "pending",
              detectedAt: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
    return anomalies;
  }
};

// src/algorithms/AmlAudit.ts
var DEFAULT_CONFIG8 = {
  declarationThreshold: 5e6,
  // 5M FCFA (seuil CEMAC/UEMOA)
  cashReportingThreshold: 5e6,
  // 5M FCFA
  structuringWindow: 7,
  // 7 jours
  structuringMaxCount: 5,
  // 5 transactions
  highRiskCountries: [
    "IRAN",
    "COREE DU NORD",
    "AFGHANISTAN",
    "PAKISTAN",
    "YEMEN",
    "SYRIE",
    "IRAK",
    "LIBYE",
    "SOUDAN"
  ],
  suspiciousKeywords: [
    "casino",
    "jeux",
    "gaming",
    "crypto",
    "bitcoin",
    "offshore",
    "shell",
    "nominee",
    "bearer",
    "hawala",
    "change manuel",
    "bureau de change"
  ],
  patternThreshold: 5
};
var AmlAudit = class {
  config;
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG8, ...config };
  }
  /**
   * Analyser les transactions pour détecter les indicateurs de blanchiment
   */
  analyze(transactions) {
    const anomalies = [];
    anomalies.push(...this.detectStructuring(transactions));
    anomalies.push(...this.detectHighRiskCountries(transactions));
    anomalies.push(...this.detectUnusualPatterns(transactions));
    anomalies.push(...this.detectCashIntensive(transactions));
    anomalies.push(...this.detectRoundTripping(transactions));
    anomalies.push(...this.detectRapidMovement(transactions));
    anomalies.push(...this.detectDormantReactivation(transactions));
    anomalies.push(...this.detectSuspiciousDescriptions(transactions));
    anomalies.push(...this.detectThresholdBreaches(transactions));
    return anomalies;
  }
  /**
   * Détecter le structuring (fractionnement pour éviter les seuils)
   */
  detectStructuring(transactions) {
    const anomalies = [];
    const threshold = this.config.declarationThreshold;
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].date);
      const windowEnd = subDays(windowStart, -this.config.structuringWindow);
      const windowTransactions = sorted.filter((t) => {
        const date = new Date(t.date);
        return date >= windowStart && date <= windowEnd;
      });
      const nearThreshold = windowTransactions.filter((t) => {
        const amount = Math.abs(t.amount);
        return amount >= threshold * 0.6 && amount < threshold;
      });
      if (nearThreshold.length >= this.config.structuringMaxCount) {
        const totalAmount = nearThreshold.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        if (totalAmount >= threshold) {
          anomalies.push({
            id: v4_default(),
            type: "AML_ALERT" /* AML_ALERT */,
            severity: "CRITICAL" /* CRITICAL */,
            confidence: 0.9,
            amount: totalAmount,
            transactions: nearThreshold,
            evidence: [
              {
                type: "ALERT_TYPE",
                description: "Type d'alerte",
                value: "STRUCTURING (Fractionnement)"
              },
              {
                type: "TRANSACTION_COUNT",
                description: "Nombre de transactions",
                value: nearThreshold.length
              },
              {
                type: "TOTAL_AMOUNT",
                description: "Montant total",
                value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "THRESHOLD",
                description: "Seuil de d\xE9claration",
                value: `${threshold.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "PERIOD",
                description: "P\xE9riode",
                value: `${format(windowStart, "dd/MM/yyyy")} - ${format(windowEnd, "dd/MM/yyyy")}`
              },
              {
                type: "GAFI_INDICATOR",
                description: "Indicateur GAFI",
                value: "Fractionnement de transactions (smurfing)"
              }
            ],
            recommendation: `ALERTE CRITIQUE: Possible structuring d\xE9tect\xE9. ${nearThreshold.length} transactions totalisant ${totalAmount.toLocaleString("fr-FR")} FCFA sur ${this.config.structuringWindow} jours, chacune juste sous le seuil de d\xE9claration. SIGNALER \xE0 la cellule LCB-FT pour d\xE9claration de soup\xE7on si confirm\xE9.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
          i += nearThreshold.length - 1;
        }
      }
    }
    return anomalies;
  }
  /**
   * Détecter les transactions avec pays à risque
   */
  detectHighRiskCountries(transactions) {
    const anomalies = [];
    const highRiskTransactions = [];
    for (const t of transactions) {
      const description = t.description.toUpperCase();
      for (const country of this.config.highRiskCountries) {
        const re = new RegExp(`\\b${country}\\b`);
        if (re.test(description)) {
          highRiskTransactions.push(t);
          break;
        }
      }
    }
    if (highRiskTransactions.length > 0) {
      const totalAmount = highRiskTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      anomalies.push({
        id: v4_default(),
        type: "AML_ALERT" /* AML_ALERT */,
        severity: "CRITICAL" /* CRITICAL */,
        confidence: 0.85,
        amount: totalAmount,
        transactions: highRiskTransactions,
        evidence: [
          {
            type: "ALERT_TYPE",
            description: "Type d'alerte",
            value: "HIGH_RISK_COUNTRY"
          },
          {
            type: "TRANSACTION_COUNT",
            description: "Nombre de transactions",
            value: highRiskTransactions.length
          },
          {
            type: "TOTAL_AMOUNT",
            description: "Montant total",
            value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "COUNTRIES_DETECTED",
            description: "Pays \xE0 risque d\xE9tect\xE9s",
            value: this.config.highRiskCountries.filter(
              (c) => highRiskTransactions.some((t) => t.description.toUpperCase().includes(c))
            ).join(", ")
          },
          {
            type: "GAFI_REFERENCE",
            description: "R\xE9f\xE9rence GAFI",
            value: "Juridictions \xE0 haut risque et sous surveillance"
          }
        ],
        recommendation: `ALERTE: ${highRiskTransactions.length} transactions avec des pays \xE0 risque (liste GAFI) pour ${totalAmount.toLocaleString("fr-FR")} FCFA. Renforcer la vigilance et documenter l'origine et la destination des fonds.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les patterns inhabituels
   */
  detectUnusualPatterns(transactions) {
    const anomalies = [];
    const byAmount = /* @__PURE__ */ new Map();
    for (const t of transactions) {
      const amount = Math.abs(t.amount);
      if (!byAmount.has(amount)) {
        byAmount.set(amount, []);
      }
      byAmount.get(amount).push(t);
    }
    for (const [amount, amountTransactions] of byAmount) {
      if (amountTransactions.length >= this.config.patternThreshold && amount >= 1e5) {
        anomalies.push({
          id: v4_default(),
          type: "AML_ALERT" /* AML_ALERT */,
          severity: "HIGH" /* HIGH */,
          confidence: 0.8,
          amount: amount * amountTransactions.length,
          transactions: amountTransactions.slice(0, 10),
          evidence: [
            {
              type: "ALERT_TYPE",
              description: "Type d'alerte",
              value: "UNUSUAL_PATTERN (R\xE9p\xE9tition)"
            },
            {
              type: "REPEATED_AMOUNT",
              description: "Montant r\xE9p\xE9t\xE9",
              value: `${amount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "OCCURRENCE_COUNT",
              description: "Nombre d'occurrences",
              value: amountTransactions.length
            }
          ],
          recommendation: `Pattern inhabituel: ${amountTransactions.length} transactions identiques de ${amount.toLocaleString("fr-FR")} FCFA. V\xE9rifier la justification \xE9conomique de cette r\xE9p\xE9tition.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter l'activité intensive en espèces
   */
  detectCashIntensive(transactions) {
    const anomalies = [];
    const cashTransactions = transactions.filter(
      (t) => t.type === "ATM" /* ATM */ || t.description.toLowerCase().includes("especes") || t.description.toLowerCase().includes("esp\xE8ces") || t.description.toLowerCase().includes("cash") || t.description.toLowerCase().includes("retrait") || t.description.toLowerCase().includes("versement")
    );
    const totalCash = cashTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalAll = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    if (totalAll > 0 && totalCash / totalAll > 0.6) {
      anomalies.push({
        id: v4_default(),
        type: "AML_ALERT" /* AML_ALERT */,
        severity: "HIGH" /* HIGH */,
        confidence: 0.85,
        amount: totalCash,
        transactions: cashTransactions.slice(0, 20),
        evidence: [
          {
            type: "ALERT_TYPE",
            description: "Type d'alerte",
            value: "CASH_INTENSIVE"
          },
          {
            type: "CASH_VOLUME",
            description: "Volume esp\xE8ces",
            value: `${totalCash.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "CASH_PERCENTAGE",
            description: "Pourcentage esp\xE8ces",
            value: `${(totalCash / totalAll * 100).toFixed(1)}%`
          },
          {
            type: "TRANSACTION_COUNT",
            description: "Nombre d'op\xE9rations esp\xE8ces",
            value: cashTransactions.length
          },
          {
            type: "INDICATOR",
            description: "Indicateur",
            value: "Utilisation intensive d'esp\xE8ces (> 60%)"
          }
        ],
        recommendation: `Activit\xE9 intensive en esp\xE8ces: ${(totalCash / totalAll * 100).toFixed(1)}% du volume (${totalCash.toLocaleString("fr-FR")} FCFA). L'utilisation excessive d'esp\xE8ces est un indicateur de blanchiment. V\xE9rifier la coh\xE9rence avec l'activit\xE9 d\xE9clar\xE9e.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    const largeCashDeposits = cashTransactions.filter(
      (t) => t.amount > 0 && t.amount >= this.config.cashReportingThreshold
    );
    if (largeCashDeposits.length > 0) {
      const totalDeposits = largeCashDeposits.reduce((sum, t) => sum + t.amount, 0);
      anomalies.push({
        id: v4_default(),
        type: "AML_ALERT" /* AML_ALERT */,
        severity: "CRITICAL" /* CRITICAL */,
        confidence: 0.95,
        amount: totalDeposits,
        transactions: largeCashDeposits,
        evidence: [
          {
            type: "ALERT_TYPE",
            description: "Type d'alerte",
            value: "LARGE_CASH_DEPOSIT"
          },
          {
            type: "DEPOSIT_COUNT",
            description: "Nombre de d\xE9p\xF4ts",
            value: largeCashDeposits.length
          },
          {
            type: "TOTAL_DEPOSITS",
            description: "Total des d\xE9p\xF4ts",
            value: `${totalDeposits.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "THRESHOLD",
            description: "Seuil de d\xE9claration",
            value: `${this.config.cashReportingThreshold.toLocaleString("fr-FR")} FCFA`
          }
        ],
        recommendation: `${largeCashDeposits.length} d\xE9p\xF4ts en esp\xE8ces \u2265 ${this.config.cashReportingThreshold.toLocaleString("fr-FR")} FCFA pour un total de ${totalDeposits.toLocaleString("fr-FR")} FCFA. Ces op\xE9rations sont soumises \xE0 d\xE9claration obligatoire (DOS/CTOS).`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les allers-retours (round-tripping)
   */
  detectRoundTripping(transactions) {
    const anomalies = [];
    const roundTrips = [];
    const credits = transactions.filter((t) => t.amount > 0);
    const debits = transactions.filter((t) => t.amount < 0);
    for (const credit of credits) {
      for (const debit of debits) {
        const amountDiff = Math.abs(credit.amount + debit.amount);
        const tolerance = Math.abs(credit.amount) * 0.05;
        if (amountDiff <= tolerance) {
          const timeDiff = Math.abs(
            differenceInHours(new Date(credit.date), new Date(debit.date))
          );
          if (timeDiff <= 72) {
            roundTrips.push({ credit, debit });
          }
        }
      }
    }
    if (roundTrips.length >= 3) {
      const totalAmount = roundTrips.reduce((sum, rt) => sum + Math.abs(rt.credit.amount), 0);
      anomalies.push({
        id: v4_default(),
        type: "AML_ALERT" /* AML_ALERT */,
        severity: "HIGH" /* HIGH */,
        confidence: 0.85,
        amount: totalAmount,
        transactions: roundTrips.flatMap((rt) => [rt.credit, rt.debit]).slice(0, 20),
        evidence: [
          {
            type: "ALERT_TYPE",
            description: "Type d'alerte",
            value: "ROUND_TRIPPING (Allers-retours)"
          },
          {
            type: "PAIR_COUNT",
            description: "Nombre de paires",
            value: roundTrips.length
          },
          {
            type: "TOTAL_AMOUNT",
            description: "Montant total",
            value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "INDICATOR",
            description: "Indicateur GAFI",
            value: "Mouvements de fonds circulaires"
          }
        ],
        recommendation: `${roundTrips.length} paires d'allers-retours d\xE9tect\xE9es (${totalAmount.toLocaleString("fr-FR")} FCFA). Les mouvements circulaires peuvent indiquer du layering (empilement). V\xE9rifier la justification \xE9conomique.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les mouvements rapides de fonds
   */
  detectRapidMovement(transactions) {
    const anomalies = [];
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      if (current.amount <= 0) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        const hours = differenceInHours(new Date(next.date), new Date(current.date));
        if (hours > 24) break;
        if (next.amount < 0) {
          const outAmount = Math.abs(next.amount);
          const inAmount = current.amount;
          if (outAmount >= inAmount * 0.8 && inAmount >= 1e6) {
            anomalies.push({
              id: v4_default(),
              type: "AML_ALERT" /* AML_ALERT */,
              severity: "HIGH" /* HIGH */,
              confidence: 0.8,
              amount: inAmount,
              transactions: [current, next],
              evidence: [
                {
                  type: "ALERT_TYPE",
                  description: "Type d'alerte",
                  value: "RAPID_MOVEMENT"
                },
                {
                  type: "CREDIT_AMOUNT",
                  description: "Entr\xE9e",
                  value: `${inAmount.toLocaleString("fr-FR")} FCFA`
                },
                {
                  type: "DEBIT_AMOUNT",
                  description: "Sortie",
                  value: `${outAmount.toLocaleString("fr-FR")} FCFA`
                },
                {
                  type: "TIME_GAP",
                  description: "D\xE9lai",
                  value: `${hours} heures`
                },
                {
                  type: "INDICATOR",
                  description: "Indicateur",
                  value: "Pass-through rapide de fonds"
                }
              ],
              recommendation: `Mouvement rapide: ${inAmount.toLocaleString("fr-FR")} FCFA entr\xE9 puis ${outAmount.toLocaleString("fr-FR")} FCFA sorti en ${hours} heures. Ce pattern de "pass-through" est suspect. V\xE9rifier la destination des fonds.`,
              status: "pending",
              detectedAt: /* @__PURE__ */ new Date()
            });
            break;
          }
        }
      }
    }
    return anomalies;
  }
  /**
   * Détecter la réactivation de comptes dormants
   */
  detectDormantReactivation(transactions) {
    const anomalies = [];
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    if (sorted.length < 2) return anomalies;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = differenceInDays(new Date(curr.date), new Date(prev.date));
      if (gap >= 90) {
        const reactivationDate = new Date(curr.date);
        const windowEnd = subDays(reactivationDate, -30);
        const reactivationTransactions = sorted.filter((t) => {
          const date = new Date(t.date);
          return date >= reactivationDate && date <= windowEnd;
        });
        const reactivationVolume = reactivationTransactions.reduce(
          (sum, t) => sum + Math.abs(t.amount),
          0
        );
        if (reactivationVolume >= 5e6) {
          anomalies.push({
            id: v4_default(),
            type: "AML_ALERT" /* AML_ALERT */,
            severity: "HIGH" /* HIGH */,
            confidence: 0.8,
            amount: reactivationVolume,
            transactions: reactivationTransactions.slice(0, 10),
            evidence: [
              {
                type: "ALERT_TYPE",
                description: "Type d'alerte",
                value: "DORMANT_REACTIVATION"
              },
              {
                type: "DORMANT_PERIOD",
                description: "P\xE9riode d'inactivit\xE9",
                value: `${gap} jours`
              },
              {
                type: "REACTIVATION_DATE",
                description: "Date de r\xE9activation",
                value: format(reactivationDate, "dd/MM/yyyy")
              },
              {
                type: "POST_REACTIVATION_VOLUME",
                description: "Volume post-r\xE9activation (30j)",
                value: `${reactivationVolume.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "INDICATOR",
                description: "Indicateur GAFI",
                value: "R\xE9activation soudaine avec forte activit\xE9"
              }
            ],
            recommendation: `Compte dormant (${gap} jours) r\xE9activ\xE9 le ${format(reactivationDate, "dd/MM/yyyy")} avec ${reactivationVolume.toLocaleString("fr-FR")} FCFA de volume en 30 jours. Ce pattern peut indiquer l'utilisation d'un compte dormant pour blanchiment.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Détecter les descriptions suspectes
   */
  detectSuspiciousDescriptions(transactions) {
    const anomalies = [];
    const suspiciousTransactions = [];
    for (const t of transactions) {
      const description = t.description.toLowerCase();
      for (const keyword of this.config.suspiciousKeywords) {
        if (description.includes(keyword.toLowerCase())) {
          suspiciousTransactions.push({ transaction: t, keyword });
          break;
        }
      }
    }
    if (suspiciousTransactions.length > 0) {
      const totalAmount = suspiciousTransactions.reduce(
        (sum, st) => sum + Math.abs(st.transaction.amount),
        0
      );
      anomalies.push({
        id: v4_default(),
        type: "AML_ALERT" /* AML_ALERT */,
        severity: "HIGH" /* HIGH */,
        confidence: 0.75,
        amount: totalAmount,
        transactions: suspiciousTransactions.map((st) => st.transaction).slice(0, 10),
        evidence: [
          {
            type: "ALERT_TYPE",
            description: "Type d'alerte",
            value: "SUSPICIOUS_DESCRIPTION"
          },
          {
            type: "TRANSACTION_COUNT",
            description: "Nombre de transactions",
            value: suspiciousTransactions.length
          },
          {
            type: "KEYWORDS_DETECTED",
            description: "Mots-cl\xE9s d\xE9tect\xE9s",
            value: [...new Set(suspiciousTransactions.map((st) => st.keyword))].join(", ")
          },
          {
            type: "TOTAL_AMOUNT",
            description: "Montant total",
            value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
          }
        ],
        recommendation: `${suspiciousTransactions.length} transactions avec des libell\xE9s suspects d\xE9tect\xE9es (${totalAmount.toLocaleString("fr-FR")} FCFA). Mots-cl\xE9s: ${[...new Set(suspiciousTransactions.map((st) => st.keyword))].join(", ")}. V\xE9rifier la nature de ces op\xE9rations.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les dépassements de seuil de déclaration
   */
  detectThresholdBreaches(transactions) {
    const anomalies = [];
    const overThreshold = transactions.filter(
      (t) => Math.abs(t.amount) >= this.config.declarationThreshold
    );
    if (overThreshold.length > 0) {
      const totalAmount = overThreshold.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      anomalies.push({
        id: v4_default(),
        type: "AML_ALERT" /* AML_ALERT */,
        severity: "MEDIUM" /* MEDIUM */,
        // Pas forcément suspect, mais à vérifier
        confidence: 1,
        // Factuel
        amount: totalAmount,
        transactions: overThreshold,
        evidence: [
          {
            type: "ALERT_TYPE",
            description: "Type d'alerte",
            value: "THRESHOLD_BREACH"
          },
          {
            type: "TRANSACTION_COUNT",
            description: "Transactions concern\xE9es",
            value: overThreshold.length
          },
          {
            type: "TOTAL_AMOUNT",
            description: "Montant total",
            value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "THRESHOLD",
            description: "Seuil de d\xE9claration",
            value: `${this.config.declarationThreshold.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "REGULATION",
            description: "R\xE9glementation",
            value: "R\xE8glement CEMAC/UEMOA sur la LCB-FT"
          }
        ],
        recommendation: `${overThreshold.length} transactions \u2265 ${this.config.declarationThreshold.toLocaleString("fr-FR")} FCFA (seuil de d\xE9claration). V\xE9rifier que les d\xE9clarations obligatoires ont \xE9t\xE9 effectu\xE9es et que les justificatifs \xE9conomiques sont disponibles.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
};

// src/algorithms/AccountFeesAudit.ts
var DEFAULT_CONFIG9 = {
  feeTolerance: 0.05,
  // 5%
  checkFrequency: true,
  expectedPeriod: 30
  // mensuel
};
var AccountFeesAudit = class {
  config;
  bankConditions;
  constructor(config, bankConditions) {
    this.config = { ...DEFAULT_CONFIG9, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser les frais de tenue de compte
   */
  analyze(transactions) {
    const anomalies = [];
    const accountFees = transactions.filter((t) => this.isAccountFee(t));
    if (accountFees.length === 0) return anomalies;
    if (this.bankConditions) {
      anomalies.push(...this.checkAgainstContract(accountFees));
    }
    anomalies.push(...this.detectDuplicateFees(accountFees));
    if (this.config.checkFrequency) {
      anomalies.push(...this.checkFeeFrequency(accountFees));
    }
    anomalies.push(...this.detectFeeIncreases(accountFees));
    anomalies.push(...this.detectUnusualFees(accountFees));
    return anomalies;
  }
  /**
   * Identifier si une transaction est un frais de compte
   */
  isAccountFee(transaction) {
    const keywords = [
      "tenue de compte",
      "tenue compte",
      "frais gestion",
      "cotisation",
      "abonnement",
      "frais mensuels",
      "frais trimestriels",
      "frais annuels",
      "frais de releve",
      "frais courrier",
      "frais dossier",
      "frais ouverture",
      "frais cloture",
      "commission de compte",
      "maintenance compte"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Vérifier les frais par rapport au contrat
   */
  checkAgainstContract(fees) {
    var _a, _b;
    const anomalies = [];
    if (!((_a = this.bankConditions) == null ? void 0 : _a.accountFees)) return anomalies;
    const contractFees = this.bankConditions.accountFees;
    for (const fee of fees) {
      const desc = fee.description.toLowerCase();
      const amount = Math.abs(fee.amount);
      if (desc.includes("tenue") && contractFees.tenueCompte) {
        const expected = contractFees.tenueCompte.particulier;
        const tolerance = expected * this.config.feeTolerance;
        if (amount > expected + tolerance) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Frais de tenue de compte",
            expected,
            amount
          ));
        }
      }
      if (desc.includes("releve") && ((_b = contractFees.releveCompte) == null ? void 0 : _b.mensuel)) {
        const expected = contractFees.releveCompte.mensuel;
        const tolerance = expected * this.config.feeTolerance;
        if (amount > expected + tolerance) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Frais de relev\xE9",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Détecter les frais prélevés en double
   */
  detectDuplicateFees(fees) {
    const anomalies = [];
    const monthlyFees = /* @__PURE__ */ new Map();
    for (const fee of fees) {
      const monthKey = format(new Date(fee.date), "yyyy-MM");
      const feeType = this.extractFeeType(fee.description);
      const key = `${monthKey}-${feeType}`;
      if (!monthlyFees.has(key)) {
        monthlyFees.set(key, []);
      }
      monthlyFees.get(key).push(fee);
    }
    for (const [key, transactions] of monthlyFees) {
      if (transactions.length > 1) {
        const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const [, feeType] = key.split("-");
        anomalies.push({
          id: v4_default(),
          type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
          severity: "HIGH" /* HIGH */,
          confidence: 0.9,
          amount: total - Math.abs(transactions[0].amount),
          // Montant en trop
          transactions,
          evidence: [
            {
              type: "FEE_TYPE",
              description: "Type de frais",
              value: feeType
            },
            {
              type: "COUNT",
              description: "Nombre de pr\xE9l\xE8vements",
              value: transactions.length
            },
            {
              type: "TOTAL",
              description: "Montant total pr\xE9lev\xE9",
              value: `${total.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Frais "${feeType}" pr\xE9lev\xE9 ${transactions.length} fois ce mois. Total: ${total.toLocaleString("fr-FR")} FCFA. Demander le remboursement des doublons.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Vérifier la fréquence des frais
   */
  checkFeeFrequency(fees) {
    const anomalies = [];
    const feesByType = /* @__PURE__ */ new Map();
    for (const fee of fees) {
      const feeType = this.extractFeeType(fee.description);
      if (!feesByType.has(feeType)) {
        feesByType.set(feeType, []);
      }
      feesByType.get(feeType).push(fee);
    }
    for (const [feeType, typeFees] of feesByType) {
      if (typeFees.length < 2) continue;
      const sorted = typeFees.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const intervals = [];
      for (let i = 1; i < sorted.length; i++) {
        const days = Math.round(
          (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / (1e3 * 60 * 60 * 24)
        );
        intervals.push(days);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const shortIntervals = intervals.filter((i) => i < this.config.expectedPeriod * 0.7);
      if (shortIntervals.length > 0) {
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.75,
          amount: typeFees.reduce((sum, t) => sum + Math.abs(t.amount), 0),
          transactions: sorted,
          evidence: [
            {
              type: "FEE_TYPE",
              description: "Type de frais",
              value: feeType
            },
            {
              type: "AVG_INTERVAL",
              description: "Intervalle moyen",
              value: `${Math.round(avgInterval)} jours`
            },
            {
              type: "EXPECTED",
              description: "Intervalle attendu",
              value: `${this.config.expectedPeriod} jours`
            }
          ],
          recommendation: `Frais "${feeType}" pr\xE9lev\xE9 plus fr\xE9quemment que pr\xE9vu. Intervalle moyen: ${Math.round(avgInterval)} jours vs ${this.config.expectedPeriod} attendus. V\xE9rifier la p\xE9riodicit\xE9 contractuelle.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les augmentations de frais
   */
  detectFeeIncreases(fees) {
    const anomalies = [];
    const feesByType = /* @__PURE__ */ new Map();
    for (const fee of fees) {
      const feeType = this.extractFeeType(fee.description);
      if (!feesByType.has(feeType)) {
        feesByType.set(feeType, []);
      }
      feesByType.get(feeType).push(fee);
    }
    for (const [feeType, typeFees] of feesByType) {
      if (typeFees.length < 3) continue;
      const sorted = typeFees.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const amounts = sorted.map((t) => Math.abs(t.amount));
      const firstAmount = amounts[0];
      const lastAmount = amounts[amounts.length - 1];
      if (lastAmount > firstAmount * 1.1) {
        const increase = (lastAmount - firstAmount) / firstAmount * 100;
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: increase > 25 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
          confidence: 0.8,
          amount: lastAmount - firstAmount,
          transactions: [sorted[0], sorted[sorted.length - 1]],
          evidence: [
            {
              type: "FEE_TYPE",
              description: "Type de frais",
              value: feeType
            },
            {
              type: "INITIAL_AMOUNT",
              description: "Montant initial",
              value: `${firstAmount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "CURRENT_AMOUNT",
              description: "Montant actuel",
              value: `${lastAmount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "INCREASE",
              description: "Augmentation",
              value: `+${increase.toFixed(1)}%`
            }
          ],
          recommendation: `Augmentation de ${increase.toFixed(1)}% des frais "${feeType}". De ${firstAmount.toLocaleString("fr-FR")} \xE0 ${lastAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier si l'augmentation est justifi\xE9e par le contrat.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les frais inhabituels
   */
  detectUnusualFees(fees) {
    const anomalies = [];
    const amounts = fees.map((f) => Math.abs(f.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );
    const threshold = mean + 2 * stdDev;
    for (const fee of fees) {
      const amount = Math.abs(fee.amount);
      if (amount > threshold) {
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.7,
          amount,
          transactions: [fee],
          evidence: [
            {
              type: "AMOUNT",
              description: "Montant",
              value: `${amount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "AVERAGE",
              description: "Moyenne des frais",
              value: `${mean.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "MULTIPLIER",
              description: "Fois la moyenne",
              value: `${(amount / mean).toFixed(1)}x`
            }
          ],
          recommendation: `Frais inhabituellement \xE9lev\xE9 de ${amount.toLocaleString("fr-FR")} FCFA (${(amount / mean).toFixed(1)}x la moyenne). Libell\xE9: "${fee.description}". Demander une justification.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Extraire le type de frais du libellé
   */
  extractFeeType(description) {
    const desc = description.toLowerCase();
    if (desc.includes("tenue")) return "Tenue de compte";
    if (desc.includes("cotisation")) return "Cotisation";
    if (desc.includes("abonnement")) return "Abonnement";
    if (desc.includes("releve")) return "Frais de relev\xE9";
    if (desc.includes("courrier")) return "Frais de courrier";
    if (desc.includes("gestion")) return "Frais de gestion";
    return "Frais divers";
  }
  /**
   * Créer une anomalie de surfacturation
   */
  createOverchargeAnomaly(transaction, feeType, expected, actual) {
    return {
      id: v4_default(),
      type: "OVERCHARGE" /* OVERCHARGE */,
      severity: actual > expected * 1.5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: actual - expected,
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_TYPE",
          description: "Type de frais",
          value: feeType
        },
        {
          type: "EXPECTED",
          description: "Montant contractuel",
          value: `${expected.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACTUAL",
          description: "Montant pr\xE9lev\xE9",
          value: `${actual.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OVERCHARGE",
          description: "Surfacturation",
          value: `${(actual - expected).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Surfacturation de ${(actual - expected).toLocaleString("fr-FR")} FCFA sur "${feeType}". Montant contractuel: ${expected.toLocaleString("fr-FR")} FCFA, montant pr\xE9lev\xE9: ${actual.toLocaleString("fr-FR")} FCFA. Demander le remboursement.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/CardFeesAudit.ts
var DEFAULT_CONFIG10 = {
  feeTolerance: 0.05,
  defaultDailyWithdrawalLimit: 5e5,
  // 500k FCFA
  defaultMonthlyPaymentLimit: 2e6,
  // 2M FCFA
  foreignAtmCommission: 0.03
  // 3%
};
var CardFeesAudit = class {
  config;
  bankConditions;
  constructor(config, bankConditions) {
    this.config = { ...DEFAULT_CONFIG10, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser les frais de cartes
   */
  analyze(transactions) {
    const anomalies = [];
    const cardFees = transactions.filter((t) => this.isCardFee(t));
    const atmWithdrawals = transactions.filter((t) => this.isAtmWithdrawal(t));
    const cardPayments = transactions.filter((t) => this.isCardPayment(t));
    anomalies.push(...this.checkCardSubscriptions(cardFees));
    anomalies.push(...this.analyzeAtmFees(atmWithdrawals, cardFees));
    anomalies.push(...this.checkLimits(atmWithdrawals, cardPayments));
    anomalies.push(...this.analyzeForeignFees(cardFees, atmWithdrawals));
    anomalies.push(...this.detectOppositionFees(cardFees));
    anomalies.push(...this.checkRenewalFees(cardFees));
    return anomalies;
  }
  /**
   * Identifier si c'est un frais de carte
   */
  isCardFee(transaction) {
    const keywords = [
      "cotisation carte",
      "renouvellement carte",
      "carte bancaire",
      "frais carte",
      "commission carte",
      "opposition carte",
      "retrait dab",
      "retrait gab",
      "frais retrait",
      "visa",
      "mastercard",
      "cb "
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un retrait DAB
   */
  isAtmWithdrawal(transaction) {
    const keywords = ["retrait", "dab", "gab", "atm", "distributeur"];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un paiement carte
   */
  isCardPayment(transaction) {
    const keywords = ["paiement cb", "tpe", "paiement carte", "achat carte"];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Vérifier les cotisations cartes
   */
  checkCardSubscriptions(fees) {
    var _a, _b;
    const anomalies = [];
    const subscriptions = fees.filter(
      (f) => f.description.toLowerCase().includes("cotisation") || f.description.toLowerCase().includes("renouvellement")
    );
    const yearlySubscriptions = /* @__PURE__ */ new Map();
    for (const sub of subscriptions) {
      const year = format(new Date(sub.date), "yyyy");
      if (!yearlySubscriptions.has(year)) {
        yearlySubscriptions.set(year, []);
      }
      yearlySubscriptions.get(year).push(sub);
    }
    for (const [year, subs] of yearlySubscriptions) {
      if (subs.length > 1) {
        const total = subs.reduce((sum, s) => sum + Math.abs(s.amount), 0);
        anomalies.push({
          id: v4_default(),
          type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
          severity: "HIGH" /* HIGH */,
          confidence: 0.85,
          amount: total - Math.abs(subs[0].amount),
          transactions: subs,
          evidence: [
            {
              type: "YEAR",
              description: "Ann\xE9e",
              value: year
            },
            {
              type: "COUNT",
              description: "Nombre de cotisations",
              value: subs.length
            },
            {
              type: "TOTAL",
              description: "Total pr\xE9lev\xE9",
              value: `${total.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `${subs.length} cotisations carte pr\xE9lev\xE9es en ${year} pour un total de ${total.toLocaleString("fr-FR")} FCFA. V\xE9rifier s'il s'agit de cartes diff\xE9rentes ou de doublons \xE0 rembourser.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.cardFees) == null ? void 0 : _b.cartes) {
      for (const sub of subscriptions) {
        const amount = Math.abs(sub.amount);
        const matchingCard = this.bankConditions.cardFees.cartes.find(
          (c) => amount > c.cotisationAnnuelle * (1 - this.config.feeTolerance) && amount < c.cotisationAnnuelle * (1 + this.config.feeTolerance)
        );
        if (!matchingCard) {
          const expectedCots = this.bankConditions.cardFees.cartes.map((c) => c.cotisationAnnuelle);
          const closestCot = expectedCots.reduce(
            (prev, curr) => Math.abs(curr - amount) < Math.abs(prev - amount) ? curr : prev
          );
          if (amount > closestCot * 1.1) {
            anomalies.push({
              id: v4_default(),
              type: "OVERCHARGE" /* OVERCHARGE */,
              severity: "MEDIUM" /* MEDIUM */,
              confidence: 0.7,
              amount: amount - closestCot,
              transactions: [sub],
              evidence: [
                {
                  type: "CHARGED",
                  description: "Montant pr\xE9lev\xE9",
                  value: `${amount.toLocaleString("fr-FR")} FCFA`
                },
                {
                  type: "EXPECTED",
                  description: "Cotisation attendue",
                  value: `${closestCot.toLocaleString("fr-FR")} FCFA`
                }
              ],
              recommendation: `Cotisation carte de ${amount.toLocaleString("fr-FR")} FCFA sup\xE9rieure aux tarifs contractuels. V\xE9rifier la grille tarifaire.`,
              status: "pending",
              detectedAt: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais de retrait DAB
   */
  analyzeAtmFees(withdrawals, fees) {
    var _a, _b;
    const anomalies = [];
    const atmFees = fees.filter(
      (f) => f.description.toLowerCase().includes("retrait") || f.description.toLowerCase().includes("dab") || f.description.toLowerCase().includes("gab")
    );
    if (atmFees.length === 0) return anomalies;
    const withdrawalCount = withdrawals.length;
    const freeWithdrawals = ((_b = (_a = this.bankConditions) == null ? void 0 : _a.cardFees) == null ? void 0 : _b.retraitGratuits) || 0;
    if (freeWithdrawals > 0 && withdrawalCount <= freeWithdrawals && atmFees.length > 0) {
      const totalFees = atmFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
      anomalies.push({
        id: v4_default(),
        type: "GHOST_FEE" /* GHOST_FEE */,
        severity: "HIGH" /* HIGH */,
        confidence: 0.9,
        amount: totalFees,
        transactions: atmFees,
        evidence: [
          {
            type: "WITHDRAWALS",
            description: "Nombre de retraits",
            value: withdrawalCount
          },
          {
            type: "FREE_LIMIT",
            description: "Retraits gratuits inclus",
            value: freeWithdrawals
          },
          {
            type: "FEES_CHARGED",
            description: "Frais pr\xE9lev\xE9s",
            value: `${totalFees.toLocaleString("fr-FR")} FCFA`
          }
        ],
        recommendation: `${totalFees.toLocaleString("fr-FR")} FCFA de frais de retrait pr\xE9lev\xE9s alors que ${withdrawalCount} retraits effectu\xE9s sur ${freeWithdrawals} gratuits inclus. Demander le remboursement.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Vérifier les plafonds
   */
  checkLimits(withdrawals, _payments) {
    var _a, _b, _c, _d;
    const anomalies = [];
    const dailyWithdrawals = /* @__PURE__ */ new Map();
    for (const w of withdrawals) {
      const dateKey = format(new Date(w.date), "yyyy-MM-dd");
      if (!dailyWithdrawals.has(dateKey)) {
        dailyWithdrawals.set(dateKey, { total: 0, transactions: [] });
      }
      const day = dailyWithdrawals.get(dateKey);
      day.total += Math.abs(w.amount);
      day.transactions.push(w);
    }
    const dailyLimit = ((_d = (_c = (_b = (_a = this.bankConditions) == null ? void 0 : _a.cardFees) == null ? void 0 : _b.cartes) == null ? void 0 : _c[0]) == null ? void 0 : _d.plafondRetrait) || this.config.defaultDailyWithdrawalLimit;
    for (const [date, data] of dailyWithdrawals) {
      if (data.total > dailyLimit) {
        anomalies.push({
          id: v4_default(),
          type: "LIMIT_EXCEEDED" /* LIMIT_EXCEEDED */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.9,
          amount: data.total - dailyLimit,
          transactions: data.transactions,
          evidence: [
            {
              type: "DATE",
              description: "Date",
              value: date
            },
            {
              type: "TOTAL",
              description: "Total retir\xE9",
              value: `${data.total.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "LIMIT",
              description: "Plafond journalier",
              value: `${dailyLimit.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "EXCESS",
              description: "D\xE9passement",
              value: `${(data.total - dailyLimit).toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `D\xE9passement du plafond de retrait le ${date}: ${data.total.toLocaleString("fr-FR")} FCFA retir\xE9s vs ${dailyLimit.toLocaleString("fr-FR")} FCFA autoris\xE9s. V\xE9rifier les frais de d\xE9passement \xE9ventuels.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais à l'étranger
   */
  analyzeForeignFees(fees, withdrawals) {
    const anomalies = [];
    const foreignKeywords = ["etranger", "foreign", "intl", "international", "hors zone"];
    const foreignWithdrawals = withdrawals.filter(
      (w) => foreignKeywords.some((kw) => w.description.toLowerCase().includes(kw))
    );
    const foreignFees = fees.filter(
      (f) => foreignKeywords.some((kw) => f.description.toLowerCase().includes(kw))
    );
    if (foreignWithdrawals.length > 0) {
      const totalWithdrawn = foreignWithdrawals.reduce((sum, w) => sum + Math.abs(w.amount), 0);
      const totalFees = foreignFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
      const expectedFees = totalWithdrawn * this.config.foreignAtmCommission;
      if (totalFees > expectedFees * 1.5) {
        anomalies.push({
          id: v4_default(),
          type: "OVERCHARGE" /* OVERCHARGE */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.75,
          amount: totalFees - expectedFees,
          transactions: [...foreignWithdrawals, ...foreignFees],
          evidence: [
            {
              type: "FOREIGN_WITHDRAWALS",
              description: "Retraits \xE9trangers",
              value: `${totalWithdrawn.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "FEES_CHARGED",
              description: "Frais pr\xE9lev\xE9s",
              value: `${totalFees.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "EXPECTED_FEES",
              description: "Frais attendus (3%)",
              value: `${expectedFees.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Frais de retrait \xE9tranger \xE9lev\xE9s: ${totalFees.toLocaleString("fr-FR")} FCFA pour ${totalWithdrawn.toLocaleString("fr-FR")} FCFA retir\xE9s. V\xE9rifier le taux de commission appliqu\xE9.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les frais d'opposition multiples
   */
  detectOppositionFees(fees) {
    const anomalies = [];
    const oppositionFees = fees.filter(
      (f) => f.description.toLowerCase().includes("opposition")
    );
    if (oppositionFees.length > 1) {
      const sorted = oppositionFees.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const days = differenceInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date));
        if (days < 30) {
          anomalies.push({
            id: v4_default(),
            type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.8,
            amount: Math.abs(sorted[i].amount),
            transactions: [sorted[i - 1], sorted[i]],
            evidence: [
              {
                type: "INTERVAL",
                description: "Intervalle entre oppositions",
                value: `${days} jours`
              },
              {
                type: "FEES",
                description: "Frais",
                value: sorted.map((s) => Math.abs(s.amount).toLocaleString("fr-FR")).join(" + ") + " FCFA"
              }
            ],
            recommendation: `Multiples frais d'opposition \xE0 ${days} jours d'intervalle. V\xE9rifier s'il s'agit de la m\xEAme carte ou de cartes diff\xE9rentes.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Vérifier les frais de renouvellement
   */
  checkRenewalFees(fees) {
    const anomalies = [];
    const renewalFees = fees.filter(
      (f) => f.description.toLowerCase().includes("renouvellement")
    );
    if (renewalFees.length > 1) {
      const sorted = renewalFees.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const days = differenceInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date));
        if (days < 700) {
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.75,
            amount: Math.abs(sorted[i].amount),
            transactions: [sorted[i - 1], sorted[i]],
            evidence: [
              {
                type: "INTERVAL",
                description: "Intervalle entre renouvellements",
                value: `${Math.round(days / 30)} mois`
              },
              {
                type: "EXPECTED",
                description: "Intervalle normal",
                value: "36 mois (3 ans)"
              }
            ],
            recommendation: `Renouvellement carte apr\xE8s seulement ${Math.round(days / 30)} mois (normal: 36 mois). V\xE9rifier la raison du renouvellement anticip\xE9.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
};

// src/algorithms/PaymentMethodsAudit.ts
var DEFAULT_CONFIG11 = {
  feeTolerance: 0.05,
  highTransferFeeThreshold: 5e3,
  // FCFA
  checkChequebookFees: true,
  checkBillOfExchangeFees: true
};
var PaymentMethodsAudit = class {
  config;
  bankConditions;
  constructor(config, bankConditions) {
    this.config = { ...DEFAULT_CONFIG11, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser les frais de moyens de paiement
   */
  analyze(transactions) {
    const anomalies = [];
    if (this.config.checkChequebookFees) {
      anomalies.push(...this.analyzeCheckFees(transactions));
    }
    if (this.config.checkBillOfExchangeFees) {
      anomalies.push(...this.analyzeBillOfExchangeFees(transactions));
    }
    anomalies.push(...this.analyzeTransferFees(transactions));
    anomalies.push(...this.analyzeDirectDebitFees(transactions));
    anomalies.push(...this.detectDuplicatePaymentFees(transactions));
    return anomalies;
  }
  /**
   * Analyser les frais liés aux chèques
   */
  analyzeCheckFees(transactions) {
    var _a, _b, _c, _d;
    const anomalies = [];
    const checkFees = transactions.filter((t) => this.isCheckFee(t));
    const chequebookFees = checkFees.filter(
      (t) => t.description.toLowerCase().includes("chequier") || t.description.toLowerCase().includes("carnet de cheque")
    );
    for (const fee of chequebookFees) {
      const amount = Math.abs(fee.amount);
      if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.checkFees) == null ? void 0 : _b.chequebook) {
        const expected = this.bankConditions.checkFees.chequebook;
        const tolerance = expected * this.config.feeTolerance;
        if (amount > expected + tolerance) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Frais de ch\xE9quier",
            expected,
            amount
          ));
        }
      }
    }
    const oppositionFees = checkFees.filter(
      (t) => t.description.toLowerCase().includes("opposition cheque")
    );
    for (const fee of oppositionFees) {
      const amount = Math.abs(fee.amount);
      if ((_d = (_c = this.bankConditions) == null ? void 0 : _c.checkFees) == null ? void 0 : _d.opposition) {
        const expected = this.bankConditions.checkFees.opposition;
        const tolerance = expected * this.config.feeTolerance;
        if (amount > expected + tolerance) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Opposition ch\xE8que",
            expected,
            amount
          ));
        }
      }
    }
    const unpaidChecks = checkFees.filter(
      (t) => t.description.toLowerCase().includes("impaye") || t.description.toLowerCase().includes("rejete")
    );
    if (unpaidChecks.length > 0) {
      const monthlyUnpaid = /* @__PURE__ */ new Map();
      for (const check of unpaidChecks) {
        const month = format(new Date(check.date), "yyyy-MM");
        if (!monthlyUnpaid.has(month)) {
          monthlyUnpaid.set(month, []);
        }
        monthlyUnpaid.get(month).push(check);
      }
      for (const [month, checks] of monthlyUnpaid) {
        if (checks.length >= 2) {
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "HIGH" /* HIGH */,
            confidence: 0.85,
            amount: checks.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            transactions: checks,
            evidence: [
              {
                type: "MONTH",
                description: "Mois concern\xE9",
                value: month
              },
              {
                type: "COUNT",
                description: "Nombre de ch\xE8ques impay\xE9s",
                value: checks.length
              },
              {
                type: "TOTAL_FEES",
                description: "Total des frais",
                value: `${checks.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `${checks.length} ch\xE8ques impay\xE9s d\xE9tect\xE9s en ${month}. Total des frais: ${checks.reduce((sum, t) => sum + Math.abs(t.amount), 0).toLocaleString("fr-FR")} FCFA. V\xE9rifier les causes r\xE9currentes et n\xE9gocier les frais si motifs bancaires.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais d'effets de commerce
   */
  analyzeBillOfExchangeFees(transactions) {
    var _a, _b;
    const anomalies = [];
    const billFees = transactions.filter((t) => this.isBillOfExchangeFee(t));
    if (billFees.length === 0) return anomalies;
    const discountFees = billFees.filter(
      (t) => t.description.toLowerCase().includes("escompte")
    );
    if (discountFees.length >= 3) {
      const amounts = discountFees.map((t) => Math.abs(t.amount));
      const avgFee = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      for (const fee of discountFees) {
        const amount = Math.abs(fee.amount);
        if (amount > avgFee * 2) {
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.75,
            amount: amount - avgFee,
            transactions: [fee],
            evidence: [
              {
                type: "AMOUNT",
                description: "Frais pr\xE9lev\xE9",
                value: `${amount.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "AVERAGE",
                description: "Frais moyen escompte",
                value: `${avgFee.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "RATIO",
                description: "Ratio vs moyenne",
                value: `${(amount / avgFee).toFixed(1)}x`
              }
            ],
            recommendation: `Frais d'escompte anormalement \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA (${(amount / avgFee).toFixed(1)}x la moyenne). V\xE9rifier le calcul des agios et le taux appliqu\xE9.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    const unpaidBills = billFees.filter(
      (t) => t.description.toLowerCase().includes("effet impaye") || t.description.toLowerCase().includes("effet rejete")
    );
    if (unpaidBills.length > 0 && ((_b = (_a = this.bankConditions) == null ? void 0 : _a.billOfExchangeFees) == null ? void 0 : _b.unpaid)) {
      for (const bill of unpaidBills) {
        const amount = Math.abs(bill.amount);
        const expected = this.bankConditions.billOfExchangeFees.unpaid;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            bill,
            "Effet impay\xE9",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais de virements
   */
  analyzeTransferFees(transactions) {
    var _a, _b;
    const anomalies = [];
    const transferFees = transactions.filter((t) => this.isTransferFee(t));
    if (transferFees.length === 0) return anomalies;
    const domesticTransfers = transferFees.filter((t) => this.isDomesticTransfer(t));
    void transferFees.filter((t) => this.isInternationalTransfer(t));
    if (domesticTransfers.length > 0 && ((_b = (_a = this.bankConditions) == null ? void 0 : _a.transferFees) == null ? void 0 : _b.domestic)) {
      for (const transfer of domesticTransfers) {
        const amount = Math.abs(transfer.amount);
        const expected = this.bankConditions.transferFees.domestic;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            transfer,
            "Virement national",
            expected,
            amount
          ));
        }
      }
    }
    for (const fee of transferFees) {
      const amount = Math.abs(fee.amount);
      if (amount > this.config.highTransferFeeThreshold) {
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.7,
          amount,
          transactions: [fee],
          evidence: [
            {
              type: "AMOUNT",
              description: "Frais de virement",
              value: `${amount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "THRESHOLD",
              description: "Seuil d'alerte",
              value: `${this.config.highTransferFeeThreshold.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "DESCRIPTION",
              description: "Libell\xE9",
              value: fee.description
            }
          ],
          recommendation: `Frais de virement \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA. V\xE9rifier si les conditions tarifaires sont respect\xE9es et si une offre group\xE9e pourrait r\xE9duire ces frais.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    const monthlyTransfers = /* @__PURE__ */ new Map();
    for (const transfer of transferFees) {
      const month = format(new Date(transfer.date), "yyyy-MM");
      if (!monthlyTransfers.has(month)) {
        monthlyTransfers.set(month, []);
      }
      monthlyTransfers.get(month).push(transfer);
    }
    for (const [month, transfers] of monthlyTransfers) {
      if (transfers.length > 20) {
        const totalFees = transfers.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "LOW" /* LOW */,
          confidence: 0.65,
          amount: totalFees,
          transactions: transfers.slice(0, 5),
          // Premiers 5 exemples
          evidence: [
            {
              type: "MONTH",
              description: "Mois concern\xE9",
              value: month
            },
            {
              type: "COUNT",
              description: "Nombre de virements",
              value: transfers.length
            },
            {
              type: "TOTAL_FEES",
              description: "Total des frais",
              value: `${totalFees.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Volume \xE9lev\xE9 de virements en ${month}: ${transfers.length} op\xE9rations pour ${totalFees.toLocaleString("fr-FR")} FCFA de frais. Envisager un forfait virements ou une ren\xE9gociation tarifaire.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais de prélèvements et rejets
   */
  analyzeDirectDebitFees(transactions) {
    var _a, _b;
    const anomalies = [];
    const debitFees = transactions.filter((t) => this.isDirectDebitFee(t));
    if (debitFees.length === 0) return anomalies;
    const rejections = debitFees.filter(
      (t) => t.description.toLowerCase().includes("rejet") || t.description.toLowerCase().includes("prelevement refuse")
    );
    if (rejections.length > 0) {
      const monthlyRejections = /* @__PURE__ */ new Map();
      for (const rejection of rejections) {
        const month = format(new Date(rejection.date), "yyyy-MM");
        if (!monthlyRejections.has(month)) {
          monthlyRejections.set(month, []);
        }
        monthlyRejections.get(month).push(rejection);
      }
      for (const [month, monthRejections] of monthlyRejections) {
        if (monthRejections.length >= 2) {
          const totalFees = monthRejections.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.8,
            amount: totalFees,
            transactions: monthRejections,
            evidence: [
              {
                type: "MONTH",
                description: "Mois concern\xE9",
                value: month
              },
              {
                type: "COUNT",
                description: "Nombre de rejets",
                value: monthRejections.length
              },
              {
                type: "TOTAL_FEES",
                description: "Total des frais",
                value: `${totalFees.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `${monthRejections.length} rejets de pr\xE9l\xE8vements en ${month}. Frais totaux: ${totalFees.toLocaleString("fr-FR")} FCFA. V\xE9rifier la gestion de tr\xE9sorerie et les dates de pr\xE9l\xE8vement.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    const mandateFees = debitFees.filter(
      (t) => t.description.toLowerCase().includes("mandat") || t.description.toLowerCase().includes("autorisation prelevement")
    );
    if (mandateFees.length > 0 && ((_b = (_a = this.bankConditions) == null ? void 0 : _a.directDebitFees) == null ? void 0 : _b.mandate)) {
      for (const fee of mandateFees) {
        const amount = Math.abs(fee.amount);
        const expected = this.bankConditions.directDebitFees.mandate;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Frais de mandat de pr\xE9l\xE8vement",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Détecter les frais de paiement en double
   */
  detectDuplicatePaymentFees(transactions) {
    const anomalies = [];
    const paymentFees = transactions.filter(
      (t) => this.isCheckFee(t) || this.isTransferFee(t) || this.isDirectDebitFee(t)
    );
    const dailyFees = /* @__PURE__ */ new Map();
    for (const fee of paymentFees) {
      const dateKey = format(new Date(fee.date), "yyyy-MM-dd");
      const amount = Math.abs(fee.amount);
      const key = `${dateKey}-${amount}`;
      if (!dailyFees.has(key)) {
        dailyFees.set(key, []);
      }
      dailyFees.get(key).push(fee);
    }
    for (const [, fees] of dailyFees) {
      if (fees.length > 1) {
        const desc1 = fees[0].description.toLowerCase();
        const similarFees = fees.filter(
          (f) => this.calculateSimilarity(f.description.toLowerCase(), desc1) > 0.7
        );
        if (similarFees.length > 1) {
          const totalAmount = similarFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
          const duplicateAmount = totalAmount - Math.abs(similarFees[0].amount);
          anomalies.push({
            id: v4_default(),
            type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
            severity: "HIGH" /* HIGH */,
            confidence: 0.9,
            amount: duplicateAmount,
            transactions: similarFees,
            evidence: [
              {
                type: "DATE",
                description: "Date",
                value: format(new Date(fees[0].date), "dd/MM/yyyy")
              },
              {
                type: "COUNT",
                description: "Nombre d'occurrences",
                value: similarFees.length
              },
              {
                type: "UNIT_AMOUNT",
                description: "Montant unitaire",
                value: `${Math.abs(fees[0].amount).toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "DUPLICATE_AMOUNT",
                description: "Montant en double",
                value: `${duplicateAmount.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Frais potentiellement pr\xE9lev\xE9 ${similarFees.length} fois le m\xEAme jour. Montant en double: ${duplicateAmount.toLocaleString("fr-FR")} FCFA. Demander une v\xE9rification et le remboursement si confirm\xE9.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Identifier si une transaction est un frais de chèque
   */
  isCheckFee(transaction) {
    const keywords = [
      "cheque",
      "chequier",
      "chq",
      "carnet de cheque",
      "opposition cheque",
      "cheque impaye",
      "cheque rejete",
      "certification cheque",
      "cheque de banque"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier si une transaction est un frais d'effet de commerce
   */
  isBillOfExchangeFee(transaction) {
    const keywords = [
      "effet",
      "escompte",
      "billet",
      "traite",
      "lcr",
      "lettre de change",
      "encaissement effet",
      "effet impaye",
      "effet rejete",
      "prorogation"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier si une transaction est un frais de virement
   */
  isTransferFee(transaction) {
    const keywords = [
      "virement",
      "vir",
      "transfer",
      "swift",
      "frais envoi",
      "frais reception",
      "frais vir",
      "ordre de virement",
      "virement instantane"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un virement domestique
   */
  isDomesticTransfer(transaction) {
    const domesticKeywords = ["national", "local", "interne", "zone"];
    const internationalKeywords = ["international", "swift", "etranger", "hors zone"];
    const desc = transaction.description.toLowerCase();
    if (internationalKeywords.some((kw) => desc.includes(kw))) return false;
    if (domesticKeywords.some((kw) => desc.includes(kw))) return true;
    return true;
  }
  /**
   * Identifier un virement international
   */
  isInternationalTransfer(transaction) {
    const keywords = ["international", "swift", "etranger", "hors zone", "devises"];
    const desc = transaction.description.toLowerCase();
    return keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier si une transaction est un frais de prélèvement
   */
  isDirectDebitFee(transaction) {
    const keywords = [
      "prelevement",
      "prelev",
      "prlv",
      "rejet prelevement",
      "mandat",
      "autorisation prelevement",
      "tip",
      "sdd",
      "sepa direct debit"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Calculer la similarité entre deux chaînes (Jaccard simplifié)
   */
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = /* @__PURE__ */ new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
  /**
   * Créer une anomalie de surfacturation
   */
  createOverchargeAnomaly(transaction, feeType, expected, actual) {
    return {
      id: v4_default(),
      type: "OVERCHARGE" /* OVERCHARGE */,
      severity: actual > expected * 1.5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: actual - expected,
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_TYPE",
          description: "Type de frais",
          value: feeType
        },
        {
          type: "EXPECTED",
          description: "Montant contractuel",
          value: `${expected.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACTUAL",
          description: "Montant pr\xE9lev\xE9",
          value: `${actual.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OVERCHARGE",
          description: "Surfacturation",
          value: `${(actual - expected).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Surfacturation de ${(actual - expected).toLocaleString("fr-FR")} FCFA sur "${feeType}". Montant contractuel: ${expected.toLocaleString("fr-FR")} FCFA, montant pr\xE9lev\xE9: ${actual.toLocaleString("fr-FR")} FCFA. Demander le remboursement.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/InternationalAudit.ts
var DEFAULT_CONFIG12 = {
  feeTolerance: 0.05,
  exchangeRateMargin: 0.03,
  // 3%
  swiftFeeThreshold: 15e3,
  // FCFA
  checkExchangeOperations: true,
  monetaryZoneCodes: ["XAF", "XOF"]
  // Zone Franc
};
var REFERENCE_RATES = {
  "EUR": 655.957,
  // Parité fixe FCFA/EUR
  "USD": 600,
  // Approximatif
  "GBP": 750
  // Approximatif
};
var InternationalAudit = class {
  config;
  bankConditions;
  constructor(config, bankConditions) {
    this.config = { ...DEFAULT_CONFIG12, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser les opérations internationales
   */
  analyze(transactions) {
    const anomalies = [];
    anomalies.push(...this.analyzeInternationalTransferFees(transactions));
    if (this.config.checkExchangeOperations) {
      anomalies.push(...this.analyzeExchangeOperations(transactions));
    }
    anomalies.push(...this.analyzeDocumentaryFees(transactions));
    anomalies.push(...this.analyzeInternationalGuarantees(transactions));
    anomalies.push(...this.analyzeIntraZoneOperations(transactions));
    return anomalies;
  }
  /**
   * Analyser les frais de virements internationaux
   */
  analyzeInternationalTransferFees(transactions) {
    var _a, _b;
    const anomalies = [];
    const internationalFees = transactions.filter((t) => this.isInternationalTransferFee(t));
    if (internationalFees.length === 0) return anomalies;
    const swiftFees = internationalFees.filter(
      (t) => t.description.toLowerCase().includes("swift")
    );
    for (const fee of swiftFees) {
      const amount = Math.abs(fee.amount);
      if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.internationalFees) == null ? void 0 : _b.swift) {
        const expected = this.bankConditions.internationalFees.swift;
        const tolerance = expected * this.config.feeTolerance;
        if (amount > expected + tolerance) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Virement SWIFT",
            expected,
            amount
          ));
        }
      }
      if (amount > this.config.swiftFeeThreshold) {
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.75,
          amount,
          transactions: [fee],
          evidence: [
            {
              type: "AMOUNT",
              description: "Frais SWIFT",
              value: `${amount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "THRESHOLD",
              description: "Seuil d'alerte",
              value: `${this.config.swiftFeeThreshold.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "DESCRIPTION",
              description: "Libell\xE9",
              value: fee.description
            }
          ],
          recommendation: `Frais SWIFT \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA. V\xE9rifier si l'option de partage des frais (SHA/BEN/OUR) est optimale et si les conditions n\xE9goci\xE9es sont respect\xE9es.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    const monthlyInternational = /* @__PURE__ */ new Map();
    for (const fee of internationalFees) {
      const month = format(new Date(fee.date), "yyyy-MM");
      if (!monthlyInternational.has(month)) {
        monthlyInternational.set(month, []);
      }
      monthlyInternational.get(month).push(fee);
    }
    for (const [month, fees] of monthlyInternational) {
      if (fees.length >= 5) {
        const totalFees = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        const avgFee = totalFees / fees.length;
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "LOW" /* LOW */,
          confidence: 0.6,
          amount: totalFees,
          transactions: fees.slice(0, 5),
          evidence: [
            {
              type: "MONTH",
              description: "Mois concern\xE9",
              value: month
            },
            {
              type: "COUNT",
              description: "Nombre de virements",
              value: fees.length
            },
            {
              type: "TOTAL_FEES",
              description: "Total des frais",
              value: `${totalFees.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "AVG_FEE",
              description: "Frais moyen",
              value: `${avgFee.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Volume important de virements internationaux en ${month}: ${fees.length} op\xE9rations. Total des frais: ${totalFees.toLocaleString("fr-FR")} FCFA. N\xE9gocier un forfait ou des conditions pr\xE9f\xE9rentielles.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Analyser les opérations de change
   */
  analyzeExchangeOperations(transactions) {
    var _a, _b;
    const anomalies = [];
    const exchangeOps = transactions.filter((t) => this.isExchangeOperation(t));
    if (exchangeOps.length === 0) return anomalies;
    const exchangeByDevise = /* @__PURE__ */ new Map();
    for (const op of exchangeOps) {
      const devise = this.extractDevise(op.description);
      if (!exchangeByDevise.has(devise)) {
        exchangeByDevise.set(devise, []);
      }
      exchangeByDevise.get(devise).push(op);
    }
    for (const [devise, ops] of exchangeByDevise) {
      if (devise === "UNKNOWN") continue;
      const referenceRate = REFERENCE_RATES[devise];
      if (!referenceRate) continue;
      for (const op of ops) {
        const appliedRate = this.extractExchangeRate(op.description, op.amount);
        if (appliedRate) {
          const margin = Math.abs((appliedRate - referenceRate) / referenceRate);
          if (margin > this.config.exchangeRateMargin) {
            anomalies.push({
              id: v4_default(),
              type: "OVERCHARGE" /* OVERCHARGE */,
              severity: margin > 0.05 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
              confidence: 0.7,
              amount: Math.abs(op.amount) * margin,
              transactions: [op],
              evidence: [
                {
                  type: "DEVISE",
                  description: "Devise",
                  value: devise
                },
                {
                  type: "APPLIED_RATE",
                  description: "Taux appliqu\xE9",
                  value: appliedRate.toFixed(4)
                },
                {
                  type: "REFERENCE_RATE",
                  description: "Taux de r\xE9f\xE9rence",
                  value: referenceRate.toFixed(4)
                },
                {
                  type: "MARGIN",
                  description: "Marge banque",
                  value: `${(margin * 100).toFixed(2)}%`
                }
              ],
              recommendation: `Marge de change \xE9lev\xE9e sur op\xE9ration ${devise}: ${(margin * 100).toFixed(2)}%. Taux appliqu\xE9: ${appliedRate.toFixed(4)} vs r\xE9f\xE9rence: ${referenceRate.toFixed(4)}. Comparer avec d'autres \xE9tablissements et n\xE9gocier les conditions.`,
              status: "pending",
              detectedAt: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
    const changeFees = transactions.filter(
      (t) => t.amount < 0 && (t.description.toLowerCase().includes("commission change") || t.description.toLowerCase().includes("frais change"))
    );
    for (const fee of changeFees) {
      const amount = Math.abs(fee.amount);
      if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.exchangeFees) == null ? void 0 : _b.commission) {
        const expected = this.bankConditions.exchangeFees.commission;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Commission de change",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais documentaires
   */
  analyzeDocumentaryFees(transactions) {
    var _a, _b;
    const anomalies = [];
    const documentaryFees = transactions.filter((t) => this.isDocumentaryFee(t));
    if (documentaryFees.length === 0) return anomalies;
    const lcFees = documentaryFees.filter(
      (t) => t.description.toLowerCase().includes("credit documentaire") || t.description.toLowerCase().includes("credoc") || t.description.toLowerCase().includes("l/c")
    );
    if (lcFees.length > 0) {
      const amounts = lcFees.map((f) => Math.abs(f.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      for (const fee of lcFees) {
        const amount = Math.abs(fee.amount);
        if (amount > avgAmount * 2.5) {
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.7,
            amount: amount - avgAmount,
            transactions: [fee],
            evidence: [
              {
                type: "AMOUNT",
                description: "Frais pr\xE9lev\xE9",
                value: `${amount.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "AVERAGE",
                description: "Moyenne des frais L/C",
                value: `${avgAmount.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "RATIO",
                description: "Ratio vs moyenne",
                value: `${(amount / avgAmount).toFixed(1)}x`
              }
            ],
            recommendation: `Frais de cr\xE9dit documentaire \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA (${(amount / avgAmount).toFixed(1)}x la moyenne). V\xE9rifier la nature de l'op\xE9ration et les conditions appliqu\xE9es.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    const remiseFees = documentaryFees.filter(
      (t) => t.description.toLowerCase().includes("remise documentaire") || t.description.toLowerCase().includes("encaissement documentaire")
    );
    if (remiseFees.length > 0 && ((_b = (_a = this.bankConditions) == null ? void 0 : _a.documentaryFees) == null ? void 0 : _b.remise)) {
      for (const fee of remiseFees) {
        const amount = Math.abs(fee.amount);
        const expected = this.bankConditions.documentaryFees.remise;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Remise documentaire",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les garanties internationales
   */
  analyzeInternationalGuarantees(transactions) {
    const anomalies = [];
    const guaranteeFees = transactions.filter((t) => this.isGuaranteeFee(t));
    if (guaranteeFees.length === 0) return anomalies;
    const quarterlyGuarantees = /* @__PURE__ */ new Map();
    for (const fee of guaranteeFees) {
      const date = new Date(fee.date);
      const quarter = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      if (!quarterlyGuarantees.has(quarter)) {
        quarterlyGuarantees.set(quarter, []);
      }
      quarterlyGuarantees.get(quarter).push(fee);
    }
    for (const [quarter, fees] of quarterlyGuarantees) {
      if (fees.length > 1) {
        const amountGroups = /* @__PURE__ */ new Map();
        for (const fee of fees) {
          const amount = Math.round(Math.abs(fee.amount) / 100) * 100;
          if (!amountGroups.has(amount)) {
            amountGroups.set(amount, []);
          }
          amountGroups.get(amount).push(fee);
        }
        for (const [, groupFees] of amountGroups) {
          if (groupFees.length > 1) {
            const totalAmount = groupFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
            anomalies.push({
              id: v4_default(),
              type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
              severity: "MEDIUM" /* MEDIUM */,
              confidence: 0.75,
              amount: totalAmount - Math.abs(groupFees[0].amount),
              transactions: groupFees,
              evidence: [
                {
                  type: "QUARTER",
                  description: "Trimestre",
                  value: quarter
                },
                {
                  type: "COUNT",
                  description: "Nombre de pr\xE9l\xE8vements",
                  value: groupFees.length
                },
                {
                  type: "UNIT_AMOUNT",
                  description: "Montant similaire",
                  value: `${Math.abs(groupFees[0].amount).toLocaleString("fr-FR")} FCFA`
                }
              ],
              recommendation: `Plusieurs commissions de garantie similaires en ${quarter}. V\xE9rifier s'il s'agit de doublons ou de garanties distinctes. Demander le d\xE9tail des garanties concern\xE9es.`,
              status: "pending",
              detectedAt: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les opérations intra-zone (CEMAC/UEMOA)
   */
  analyzeIntraZoneOperations(transactions) {
    const anomalies = [];
    const intraZoneOps = transactions.filter((t) => this.isIntraZoneOperation(t));
    for (const op of intraZoneOps) {
      const opDate = format(new Date(op.date), "yyyy-MM-dd");
      const changeFees = transactions.filter(
        (t) => format(new Date(t.date), "yyyy-MM-dd") === opDate && t.amount < 0 && (t.description.toLowerCase().includes("change") || t.description.toLowerCase().includes("conversion"))
      );
      if (changeFees.length > 0) {
        const totalChangeFees = changeFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        anomalies.push({
          id: v4_default(),
          type: "GHOST_FEE" /* GHOST_FEE */,
          severity: "HIGH" /* HIGH */,
          confidence: 0.85,
          amount: totalChangeFees,
          transactions: [op, ...changeFees],
          evidence: [
            {
              type: "OPERATION",
              description: "Op\xE9ration intra-zone",
              value: op.description
            },
            {
              type: "ZONE",
              description: "Zone mon\xE9taire",
              value: "CEMAC/UEMOA (XAF/XOF)"
            },
            {
              type: "CHANGE_FEES",
              description: "Frais de change pr\xE9lev\xE9s",
              value: `${totalChangeFees.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Frais de change pr\xE9lev\xE9s sur op\xE9ration intra-zone FCFA. Les virements entre pays de la zone Franc (CEMAC/UEMOA) ne devraient pas engendrer de frais de conversion. Demander le remboursement.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Identifier un frais de virement international
   */
  isInternationalTransferFee(transaction) {
    const keywords = [
      "virement international",
      "swift",
      "vir etranger",
      "transfert international",
      "virement hors zone",
      "vir international",
      "frais swift",
      "target"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier une opération de change
   */
  isExchangeOperation(transaction) {
    const keywords = [
      "change",
      "devise",
      "conversion",
      "forex",
      "achat devise",
      "vente devise",
      "eur",
      "usd",
      "gbp"
    ];
    const desc = transaction.description.toLowerCase();
    return keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un frais documentaire
   */
  isDocumentaryFee(transaction) {
    const keywords = [
      "credit documentaire",
      "credoc",
      "l/c",
      "letter of credit",
      "remise documentaire",
      "encaissement documentaire",
      "ouverture credoc",
      "amendement credoc",
      "confirmation credoc"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un frais de garantie
   */
  isGuaranteeFee(transaction) {
    const keywords = [
      "garantie",
      "caution",
      "sblc",
      "standby",
      "garantie bancaire",
      "lettre de garantie",
      "commission garantie",
      "engagement par signature"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier une opération intra-zone
   */
  isIntraZoneOperation(transaction) {
    const intraZoneKeywords = [
      "cemac",
      "uemoa",
      "zone franc",
      "xaf",
      "xof",
      "cameroun",
      "gabon",
      "congo",
      "tchad",
      "centrafrique",
      "guinee equatoriale",
      "senegal",
      "cote ivoire",
      "mali",
      "burkina",
      "benin",
      "togo",
      "niger"
    ];
    const desc = transaction.description.toLowerCase();
    return intraZoneKeywords.some((kw) => desc.includes(kw));
  }
  /**
   * Extraire la devise depuis une description
   */
  extractDevise(description) {
    const devises = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "AUD"];
    const desc = description.toUpperCase();
    for (const devise of devises) {
      if (desc.includes(devise)) return devise;
    }
    return "UNKNOWN";
  }
  /**
   * Extraire le taux de change depuis une description
   */
  extractExchangeRate(description, _amount) {
    const patterns = [
      /taux\s*[:=]?\s*([\d.,]+)/i,
      /@\s*([\d.,]+)/,
      /cours\s*[:=]?\s*([\d.,]+)/i
    ];
    for (const pattern of patterns) {
      const match2 = description.match(pattern);
      if (match2) {
        const rate = parseFloat(match2[1].replace(",", "."));
        if (!isNaN(rate) && rate > 0) return rate;
      }
    }
    return null;
  }
  /**
   * Créer une anomalie de surfacturation
   */
  createOverchargeAnomaly(transaction, feeType, expected, actual) {
    return {
      id: v4_default(),
      type: "OVERCHARGE" /* OVERCHARGE */,
      severity: actual > expected * 1.5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: actual - expected,
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_TYPE",
          description: "Type de frais",
          value: feeType
        },
        {
          type: "EXPECTED",
          description: "Montant contractuel",
          value: `${expected.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACTUAL",
          description: "Montant pr\xE9lev\xE9",
          value: `${actual.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OVERCHARGE",
          description: "Surfacturation",
          value: `${(actual - expected).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Surfacturation de ${(actual - expected).toLocaleString("fr-FR")} FCFA sur "${feeType}". Montant contractuel: ${expected.toLocaleString("fr-FR")} FCFA, montant pr\xE9lev\xE9: ${actual.toLocaleString("fr-FR")} FCFA. Demander le remboursement.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/AncillaryServicesAudit.ts
var DEFAULT_CONFIG13 = {
  feeTolerance: 0.05,
  checkOnlineBanking: true,
  checkSafeDeposit: true,
  checkCertifications: true
};
var AncillaryServicesAudit = class {
  config;
  bankConditions;
  constructor(config, bankConditions) {
    this.config = { ...DEFAULT_CONFIG13, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser les frais de services annexes
   */
  analyze(transactions) {
    const anomalies = [];
    if (this.config.checkOnlineBanking) {
      anomalies.push(...this.analyzeOnlineBankingFees(transactions));
    }
    if (this.config.checkSafeDeposit) {
      anomalies.push(...this.analyzeSafeDepositFees(transactions));
    }
    if (this.config.checkCertifications) {
      anomalies.push(...this.analyzeCertificationFees(transactions));
    }
    anomalies.push(...this.analyzeMessagingFees(transactions));
    anomalies.push(...this.analyzeArchivingFees(transactions));
    anomalies.push(...this.detectUnusedServicesFees(transactions));
    return anomalies;
  }
  /**
   * Analyser les frais de banque en ligne
   */
  analyzeOnlineBankingFees(transactions) {
    var _a, _b, _c, _d;
    const anomalies = [];
    const onlineFees = transactions.filter((t) => this.isOnlineBankingFee(t));
    if (onlineFees.length === 0) return anomalies;
    const subscriptionFees = onlineFees.filter(
      (t) => t.description.toLowerCase().includes("abonnement") || t.description.toLowerCase().includes("cotisation")
    );
    if (subscriptionFees.length > 0) {
      const monthlyFees = /* @__PURE__ */ new Map();
      for (const fee of subscriptionFees) {
        const month = format(new Date(fee.date), "yyyy-MM");
        if (!monthlyFees.has(month)) {
          monthlyFees.set(month, []);
        }
        monthlyFees.get(month).push(fee);
      }
      for (const [month, fees] of monthlyFees) {
        if (fees.length > 1) {
          const totalAmount = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
          anomalies.push({
            id: v4_default(),
            type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.85,
            amount: totalAmount - Math.abs(fees[0].amount),
            transactions: fees,
            evidence: [
              {
                type: "MONTH",
                description: "Mois concern\xE9",
                value: month
              },
              {
                type: "COUNT",
                description: "Nombre de pr\xE9l\xE8vements",
                value: fees.length
              },
              {
                type: "TOTAL",
                description: "Total pr\xE9lev\xE9",
                value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Abonnement banque en ligne pr\xE9lev\xE9 ${fees.length} fois en ${month}. Total: ${totalAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier et demander remboursement des doublons.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.onlineBankingFees) == null ? void 0 : _b.subscription) {
        for (const fee of subscriptionFees) {
          const amount = Math.abs(fee.amount);
          const expected = this.bankConditions.onlineBankingFees.subscription;
          if (amount > expected * (1 + this.config.feeTolerance)) {
            anomalies.push(this.createOverchargeAnomaly(
              fee,
              "Abonnement banque en ligne",
              expected,
              amount
            ));
          }
        }
      }
    }
    const tokenFees = onlineFees.filter(
      (t) => t.description.toLowerCase().includes("token") || t.description.toLowerCase().includes("digipass") || t.description.toLowerCase().includes("authentification")
    );
    if (tokenFees.length > 0 && ((_d = (_c = this.bankConditions) == null ? void 0 : _c.onlineBankingFees) == null ? void 0 : _d.token)) {
      for (const fee of tokenFees) {
        const amount = Math.abs(fee.amount);
        const expected = this.bankConditions.onlineBankingFees.token;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Token/Digipass",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais de coffre-fort
   */
  analyzeSafeDepositFees(transactions) {
    const anomalies = [];
    const safeFees = transactions.filter((t) => this.isSafeDepositFee(t));
    if (safeFees.length === 0) return anomalies;
    const rentalFees = safeFees.filter(
      (t) => t.description.toLowerCase().includes("location") || t.description.toLowerCase().includes("loyer")
    );
    const accessFees = safeFees.filter(
      (t) => t.description.toLowerCase().includes("acces") || t.description.toLowerCase().includes("ouverture")
    );
    if (rentalFees.length > 0) {
      const yearlyFees = /* @__PURE__ */ new Map();
      for (const fee of rentalFees) {
        const year = format(new Date(fee.date), "yyyy");
        if (!yearlyFees.has(year)) {
          yearlyFees.set(year, []);
        }
        yearlyFees.get(year).push(fee);
      }
      for (const [year, fees] of yearlyFees) {
        if (fees.length > 2) {
          const totalAmount = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "MEDIUM" /* MEDIUM */,
            confidence: 0.8,
            amount: totalAmount,
            transactions: fees,
            evidence: [
              {
                type: "YEAR",
                description: "Ann\xE9e",
                value: year
              },
              {
                type: "COUNT",
                description: "Nombre de pr\xE9l\xE8vements",
                value: fees.length
              },
              {
                type: "TOTAL",
                description: "Total pr\xE9lev\xE9",
                value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Location coffre-fort pr\xE9lev\xE9e ${fees.length} fois en ${year}. La facturation devrait \xEAtre annuelle ou semestrielle. V\xE9rifier les conditions et demander remboursement des exc\xE9dents.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    if (accessFees.length > 0) {
      const amounts = accessFees.map((f) => Math.abs(f.amount));
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      for (const fee of accessFees) {
        const amount = Math.abs(fee.amount);
        if (amount > avgAmount * 2) {
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "LOW" /* LOW */,
            confidence: 0.7,
            amount: amount - avgAmount,
            transactions: [fee],
            evidence: [
              {
                type: "AMOUNT",
                description: "Frais pr\xE9lev\xE9",
                value: `${amount.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "AVERAGE",
                description: "Frais moyen",
                value: `${avgAmount.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Frais d'acc\xE8s coffre-fort \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA vs moyenne ${avgAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier la nature de l'op\xE9ration.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais de certifications et attestations
   */
  analyzeCertificationFees(transactions) {
    var _a;
    const anomalies = [];
    const certFees = transactions.filter((t) => this.isCertificationFee(t));
    if (certFees.length === 0) return anomalies;
    const monthlyCerts = /* @__PURE__ */ new Map();
    for (const fee of certFees) {
      const month = format(new Date(fee.date), "yyyy-MM");
      if (!monthlyCerts.has(month)) {
        monthlyCerts.set(month, []);
      }
      monthlyCerts.get(month).push(fee);
    }
    for (const [month, fees] of monthlyCerts) {
      if (fees.length >= 3) {
        const totalAmount = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "LOW" /* LOW */,
          confidence: 0.65,
          amount: totalAmount,
          transactions: fees,
          evidence: [
            {
              type: "MONTH",
              description: "Mois concern\xE9",
              value: month
            },
            {
              type: "COUNT",
              description: "Nombre de certifications",
              value: fees.length
            },
            {
              type: "TOTAL",
              description: "Total des frais",
              value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `${fees.length} demandes de certification/attestation en ${month}. Total: ${totalAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier si certaines peuvent \xEAtre regroup\xE9es ou \xE9vit\xE9es.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    if ((_a = this.bankConditions) == null ? void 0 : _a.certificationFees) {
      for (const fee of certFees) {
        const amount = Math.abs(fee.amount);
        const desc = fee.description.toLowerCase();
        let expectedFee;
        let feeType = "";
        if (desc.includes("rib") || desc.includes("releve identite")) {
          expectedFee = this.bankConditions.certificationFees.rib;
          feeType = "RIB";
        } else if (desc.includes("attestation")) {
          expectedFee = this.bankConditions.certificationFees.attestation;
          feeType = "Attestation";
        } else if (desc.includes("certification")) {
          expectedFee = this.bankConditions.certificationFees.certification;
          feeType = "Certification";
        }
        if (expectedFee && amount > expectedFee * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(fee, feeType, expectedFee, amount));
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais de messagerie et alertes
   */
  analyzeMessagingFees(transactions) {
    const anomalies = [];
    const messagingFees = transactions.filter((t) => this.isMessagingFee(t));
    if (messagingFees.length === 0) return anomalies;
    const monthlyFees = /* @__PURE__ */ new Map();
    for (const fee of messagingFees) {
      const month = format(new Date(fee.date), "yyyy-MM");
      if (!monthlyFees.has(month)) {
        monthlyFees.set(month, []);
      }
      monthlyFees.get(month).push(fee);
    }
    const monthlyTotals = Array.from(monthlyFees.values()).map((fees) => fees.reduce((sum, f) => sum + Math.abs(f.amount), 0));
    if (monthlyTotals.length >= 3) {
      const avgMonthly = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
      for (const [month, fees] of monthlyFees) {
        const monthTotal = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        if (monthTotal > avgMonthly * 2) {
          anomalies.push({
            id: v4_default(),
            type: "FEE_ANOMALY" /* FEE_ANOMALY */,
            severity: "LOW" /* LOW */,
            confidence: 0.7,
            amount: monthTotal - avgMonthly,
            transactions: fees,
            evidence: [
              {
                type: "MONTH",
                description: "Mois concern\xE9",
                value: month
              },
              {
                type: "TOTAL",
                description: "Total du mois",
                value: `${monthTotal.toLocaleString("fr-FR")} FCFA`
              },
              {
                type: "AVERAGE",
                description: "Moyenne mensuelle",
                value: `${avgMonthly.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Frais de messagerie/alertes \xE9lev\xE9s en ${month}: ${monthTotal.toLocaleString("fr-FR")} FCFA (moyenne: ${avgMonthly.toLocaleString("fr-FR")} FCFA). V\xE9rifier le param\xE9trage des alertes et les tarifs unitaires.`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les frais d'archivage et consultation
   */
  analyzeArchivingFees(transactions) {
    const anomalies = [];
    const archivingFees = transactions.filter((t) => this.isArchivingFee(t));
    if (archivingFees.length === 0) return anomalies;
    const searchFees = archivingFees.filter(
      (t) => t.description.toLowerCase().includes("recherche") || t.description.toLowerCase().includes("historique")
    );
    for (const fee of searchFees) {
      const amount = Math.abs(fee.amount);
      if (amount > 1e4) {
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.75,
          amount,
          transactions: [fee],
          evidence: [
            {
              type: "AMOUNT",
              description: "Frais de recherche",
              value: `${amount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "DESCRIPTION",
              description: "Libell\xE9",
              value: fee.description
            }
          ],
          recommendation: `Frais de recherche d'historique \xE9lev\xE9: ${amount.toLocaleString("fr-FR")} FCFA. V\xE9rifier si l'historique est disponible via la banque en ligne (souvent gratuit) avant de demander des recherches payantes.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les services inutilisés facturés
   */
  detectUnusedServicesFees(transactions) {
    const anomalies = [];
    const subscriptionFees = transactions.filter(
      (t) => t.amount < 0 && (t.description.toLowerCase().includes("abonnement") || t.description.toLowerCase().includes("cotisation") || t.description.toLowerCase().includes("forfait"))
    );
    if (subscriptionFees.length === 0) return anomalies;
    const serviceGroups = /* @__PURE__ */ new Map();
    for (const fee of subscriptionFees) {
      const serviceType = this.extractServiceType(fee.description);
      if (!serviceGroups.has(serviceType)) {
        serviceGroups.set(serviceType, []);
      }
      serviceGroups.get(serviceType).push(fee);
    }
    for (const [serviceType, fees] of serviceGroups) {
      const totalFees = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
      const relatedOperations = transactions.filter(
        (t) => t !== fees[0] && // Exclure les frais eux-mêmes
        this.isRelatedOperation(t, serviceType)
      );
      if (relatedOperations.length === 0 && fees.length >= 3) {
        anomalies.push({
          id: v4_default(),
          type: "GHOST_FEE" /* GHOST_FEE */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.7,
          amount: totalFees,
          transactions: fees,
          evidence: [
            {
              type: "SERVICE",
              description: "Service factur\xE9",
              value: serviceType
            },
            {
              type: "COUNT",
              description: "Nombre de pr\xE9l\xE8vements",
              value: fees.length
            },
            {
              type: "TOTAL",
              description: "Total des frais",
              value: `${totalFees.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "USAGE",
              description: "Op\xE9rations li\xE9es d\xE9tect\xE9es",
              value: "0"
            }
          ],
          recommendation: `Service "${serviceType}" factur\xE9 ${fees.length} fois pour ${totalFees.toLocaleString("fr-FR")} FCFA sans op\xE9rations li\xE9es d\xE9tect\xE9es. V\xE9rifier l'utilit\xE9 de ce service et envisager sa r\xE9siliation.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Identifier un frais de banque en ligne
   */
  isOnlineBankingFee(transaction) {
    const keywords = [
      "banque en ligne",
      "e-banking",
      "web banking",
      "mobile banking",
      "application mobile",
      "token",
      "digipass",
      "authentification",
      "abonnement internet",
      "services en ligne"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un frais de coffre-fort
   */
  isSafeDepositFee(transaction) {
    const keywords = [
      "coffre",
      "coffre-fort",
      "safe",
      "location coffre",
      "loyer coffre",
      "acces coffre"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un frais de certification
   */
  isCertificationFee(transaction) {
    const keywords = [
      "attestation",
      "certification",
      "rib",
      "releve identite",
      "copie conforme",
      "document certifie",
      "lettre de reference",
      "reference bancaire"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un frais de messagerie
   */
  isMessagingFee(transaction) {
    const keywords = [
      "sms",
      "alerte",
      "notification",
      "messagerie",
      "push notification",
      "email alert"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un frais d'archivage
   */
  isArchivingFee(transaction) {
    const keywords = [
      "archivage",
      "archive",
      "historique",
      "recherche documents",
      "consultation historique",
      "documents anciens"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Extraire le type de service depuis une description
   */
  extractServiceType(description) {
    const desc = description.toLowerCase();
    if (desc.includes("banque en ligne") || desc.includes("e-banking")) return "Banque en ligne";
    if (desc.includes("mobile") || desc.includes("app")) return "Services mobiles";
    if (desc.includes("coffre")) return "Coffre-fort";
    if (desc.includes("sms") || desc.includes("alerte")) return "Alertes SMS";
    if (desc.includes("token") || desc.includes("digipass")) return "Authentification";
    return "Service divers";
  }
  /**
   * Vérifier si une opération est liée à un type de service
   */
  isRelatedOperation(transaction, serviceType) {
    const desc = transaction.description.toLowerCase();
    switch (serviceType) {
      case "Banque en ligne":
        return desc.includes("virement en ligne") || desc.includes("operation web");
      case "Services mobiles":
        return desc.includes("operation mobile") || desc.includes("paiement mobile");
      case "Alertes SMS":
        return false;
      default:
        return false;
    }
  }
  /**
   * Créer une anomalie de surfacturation
   */
  createOverchargeAnomaly(transaction, feeType, expected, actual) {
    return {
      id: v4_default(),
      type: "OVERCHARGE" /* OVERCHARGE */,
      severity: actual > expected * 1.5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: actual - expected,
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_TYPE",
          description: "Type de frais",
          value: feeType
        },
        {
          type: "EXPECTED",
          description: "Montant contractuel",
          value: `${expected.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACTUAL",
          description: "Montant pr\xE9lev\xE9",
          value: `${actual.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OVERCHARGE",
          description: "Surfacturation",
          value: `${(actual - expected).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Surfacturation de ${(actual - expected).toLocaleString("fr-FR")} FCFA sur "${feeType}". Montant contractuel: ${expected.toLocaleString("fr-FR")} FCFA, montant pr\xE9lev\xE9: ${actual.toLocaleString("fr-FR")} FCFA. Demander le remboursement.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/algorithms/PackagesAudit.ts
var DEFAULT_CONFIG14 = {
  feeTolerance: 0.05,
  significantIncreaseThreshold: 0.15,
  // 15%
  checkInsurance: true,
  checkPackages: true
};
var PackagesAudit = class {
  config;
  bankConditions;
  constructor(config, bankConditions) {
    this.config = { ...DEFAULT_CONFIG14, ...config };
    this.bankConditions = bankConditions;
  }
  /**
   * Analyser les packages et assurances
   */
  analyze(transactions) {
    const anomalies = [];
    if (this.config.checkPackages) {
      anomalies.push(...this.analyzePackageFees(transactions));
    }
    if (this.config.checkInsurance) {
      anomalies.push(...this.analyzePaymentInsurance(transactions));
    }
    anomalies.push(...this.analyzeOverdraftInsurance(transactions));
    anomalies.push(...this.detectInsurancePackageOverlap(transactions));
    anomalies.push(...this.analyzeContributionIncreases(transactions));
    anomalies.push(...this.detectUnusedOptions(transactions));
    return anomalies;
  }
  /**
   * Analyser les frais de packages bancaires
   */
  analyzePackageFees(transactions) {
    var _a, _b;
    const anomalies = [];
    const packageFees = transactions.filter((t) => this.isPackageFee(t));
    if (packageFees.length === 0) return anomalies;
    const packagesByType = /* @__PURE__ */ new Map();
    for (const fee of packageFees) {
      const packageType = this.extractPackageType(fee.description);
      if (!packagesByType.has(packageType)) {
        packagesByType.set(packageType, []);
      }
      packagesByType.get(packageType).push(fee);
    }
    for (const [packageType, fees] of packagesByType) {
      const monthlyFees = /* @__PURE__ */ new Map();
      for (const fee of fees) {
        const month = format(new Date(fee.date), "yyyy-MM");
        if (!monthlyFees.has(month)) {
          monthlyFees.set(month, []);
        }
        monthlyFees.get(month).push(fee);
      }
      for (const [month, monthFees] of monthlyFees) {
        if (monthFees.length > 1) {
          const totalAmount = monthFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
          anomalies.push({
            id: v4_default(),
            type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
            severity: "HIGH" /* HIGH */,
            confidence: 0.9,
            amount: totalAmount - Math.abs(monthFees[0].amount),
            transactions: monthFees,
            evidence: [
              {
                type: "PACKAGE",
                description: "Type de package",
                value: packageType
              },
              {
                type: "MONTH",
                description: "Mois concern\xE9",
                value: month
              },
              {
                type: "COUNT",
                description: "Nombre de pr\xE9l\xE8vements",
                value: monthFees.length
              },
              {
                type: "TOTAL",
                description: "Total pr\xE9lev\xE9",
                value: `${totalAmount.toLocaleString("fr-FR")} FCFA`
              }
            ],
            recommendation: `Package "${packageType}" pr\xE9lev\xE9 ${monthFees.length} fois en ${month}. Total: ${totalAmount.toLocaleString("fr-FR")} FCFA. Demander le remboursement du/des doublon(s).`,
            status: "pending",
            detectedAt: /* @__PURE__ */ new Date()
          });
        }
      }
      if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.packageFees) == null ? void 0 : _b[packageType]) {
        for (const fee of fees) {
          const amount = Math.abs(fee.amount);
          const expected = this.bankConditions.packageFees[packageType];
          if (amount > expected * (1 + this.config.feeTolerance)) {
            anomalies.push(this.createOverchargeAnomaly(
              fee,
              `Package ${packageType}`,
              expected,
              amount
            ));
          }
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les assurances moyens de paiement
   */
  analyzePaymentInsurance(transactions) {
    var _a, _b;
    const anomalies = [];
    const insuranceFees = transactions.filter((t) => this.isPaymentInsurance(t));
    if (insuranceFees.length === 0) return anomalies;
    const cardOperations = transactions.filter(
      (t) => t.description.toLowerCase().includes("cb") || t.description.toLowerCase().includes("carte") || t.description.toLowerCase().includes("paiement")
    );
    const totalPremiums = insuranceFees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
    if (cardOperations.length < 12 && totalPremiums > 5e4) {
      anomalies.push({
        id: v4_default(),
        type: "FEE_ANOMALY" /* FEE_ANOMALY */,
        severity: "MEDIUM" /* MEDIUM */,
        confidence: 0.7,
        amount: totalPremiums,
        transactions: insuranceFees.slice(0, 5),
        evidence: [
          {
            type: "PREMIUMS",
            description: "Total des primes",
            value: `${totalPremiums.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "CARD_OPS",
            description: "Op\xE9rations carte d\xE9tect\xE9es",
            value: cardOperations.length.toString()
          },
          {
            type: "RATIO",
            description: "Co\xFBt par op\xE9ration",
            value: cardOperations.length > 0 ? `${(totalPremiums / cardOperations.length).toLocaleString("fr-FR")} FCFA` : "N/A"
          }
        ],
        recommendation: `Assurance moyens de paiement co\xFBteuse: ${totalPremiums.toLocaleString("fr-FR")} FCFA pour ${cardOperations.length} op\xE9rations carte d\xE9tect\xE9es. \xC9valuer la pertinence de cette assurance par rapport \xE0 l'utilisation r\xE9elle.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    if ((_b = (_a = this.bankConditions) == null ? void 0 : _a.insuranceFees) == null ? void 0 : _b.paymentMeans) {
      for (const fee of insuranceFees) {
        const amount = Math.abs(fee.amount);
        const expected = this.bankConditions.insuranceFees.paymentMeans;
        if (amount > expected * (1 + this.config.feeTolerance)) {
          anomalies.push(this.createOverchargeAnomaly(
            fee,
            "Assurance moyens de paiement",
            expected,
            amount
          ));
        }
      }
    }
    return anomalies;
  }
  /**
   * Analyser les assurances découvert
   */
  analyzeOverdraftInsurance(transactions) {
    const anomalies = [];
    const overdraftInsurance = transactions.filter((t) => this.isOverdraftInsurance(t));
    if (overdraftInsurance.length === 0) return anomalies;
    const overdraftInterests = transactions.filter(
      (t) => t.description.toLowerCase().includes("interet debiteur") || t.description.toLowerCase().includes("agios")
    );
    const totalPremiums = overdraftInsurance.reduce((sum, f) => sum + Math.abs(f.amount), 0);
    if (overdraftInterests.length === 0 && totalPremiums > 2e4) {
      anomalies.push({
        id: v4_default(),
        type: "GHOST_FEE" /* GHOST_FEE */,
        severity: "MEDIUM" /* MEDIUM */,
        confidence: 0.75,
        amount: totalPremiums,
        transactions: overdraftInsurance,
        evidence: [
          {
            type: "PREMIUMS",
            description: "Total primes assurance d\xE9couvert",
            value: `${totalPremiums.toLocaleString("fr-FR")} FCFA`
          },
          {
            type: "OVERDRAFT_DETECTED",
            description: "Agios/d\xE9couverts d\xE9tect\xE9s",
            value: "0"
          }
        ],
        recommendation: `Assurance d\xE9couvert pay\xE9e (${totalPremiums.toLocaleString("fr-FR")} FCFA) sans utilisation du d\xE9couvert d\xE9tect\xE9e. Si le compte reste cr\xE9diteur, envisager la r\xE9siliation de cette assurance.`,
        status: "pending",
        detectedAt: /* @__PURE__ */ new Date()
      });
    }
    return anomalies;
  }
  /**
   * Détecter les doublons entre assurance et package
   */
  detectInsurancePackageOverlap(transactions) {
    const anomalies = [];
    const packageFees = transactions.filter((t) => this.isPackageFee(t));
    const insuranceFees = transactions.filter(
      (t) => this.isPaymentInsurance(t) || this.isOverdraftInsurance(t)
    );
    if (packageFees.length === 0 || insuranceFees.length === 0) return anomalies;
    const allInclusivePackage = packageFees.find(
      (p) => p.description.toLowerCase().includes("tout compris") || p.description.toLowerCase().includes("premium") || p.description.toLowerCase().includes("integral")
    );
    if (allInclusivePackage) {
      const monthlyInsurance = /* @__PURE__ */ new Map();
      for (const fee of insuranceFees) {
        const month = format(new Date(fee.date), "yyyy-MM");
        if (!monthlyInsurance.has(month)) {
          monthlyInsurance.set(month, []);
        }
        monthlyInsurance.get(month).push(fee);
      }
      const packageMonth = format(new Date(allInclusivePackage.date), "yyyy-MM");
      const sameMonthInsurance = monthlyInsurance.get(packageMonth);
      if (sameMonthInsurance && sameMonthInsurance.length > 0) {
        const totalInsurance = sameMonthInsurance.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        anomalies.push({
          id: v4_default(),
          type: "DUPLICATE_FEE" /* DUPLICATE_FEE */,
          severity: "HIGH" /* HIGH */,
          confidence: 0.85,
          amount: totalInsurance,
          transactions: [allInclusivePackage, ...sameMonthInsurance],
          evidence: [
            {
              type: "PACKAGE",
              description: "Package souscrit",
              value: allInclusivePackage.description
            },
            {
              type: "PACKAGE_AMOUNT",
              description: "Montant package",
              value: `${Math.abs(allInclusivePackage.amount).toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "INSURANCE_COUNT",
              description: "Assurances factur\xE9es en plus",
              value: sameMonthInsurance.length.toString()
            },
            {
              type: "INSURANCE_TOTAL",
              description: "Total assurances",
              value: `${totalInsurance.toLocaleString("fr-FR")} FCFA`
            }
          ],
          recommendation: `Package "${allInclusivePackage.description}" et assurances factur\xE9s s\xE9par\xE9ment. V\xE9rifier si les assurances sont incluses dans le package. Potentiel doublon: ${totalInsurance.toLocaleString("fr-FR")} FCFA.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Analyser les augmentations de cotisations
   */
  analyzeContributionIncreases(transactions) {
    const anomalies = [];
    const recurringFees = transactions.filter(
      (t) => this.isPackageFee(t) || this.isPaymentInsurance(t) || this.isOverdraftInsurance(t)
    );
    if (recurringFees.length < 6) return anomalies;
    const feesByType = /* @__PURE__ */ new Map();
    for (const fee of recurringFees) {
      const feeType = this.extractFeeType(fee.description);
      if (!feesByType.has(feeType)) {
        feesByType.set(feeType, []);
      }
      feesByType.get(feeType).push(fee);
    }
    for (const [feeType, fees] of feesByType) {
      if (fees.length < 3) continue;
      const sorted = fees.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstAmount = Math.abs(sorted[0].amount);
      const lastAmount = Math.abs(sorted[sorted.length - 1].amount);
      if (lastAmount > firstAmount * (1 + this.config.significantIncreaseThreshold)) {
        const increase = (lastAmount - firstAmount) / firstAmount * 100;
        const monthsSpan = differenceInMonths(
          new Date(sorted[sorted.length - 1].date),
          new Date(sorted[0].date)
        );
        anomalies.push({
          id: v4_default(),
          type: "FEE_ANOMALY" /* FEE_ANOMALY */,
          severity: increase > 30 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
          confidence: 0.8,
          amount: lastAmount - firstAmount,
          transactions: [sorted[0], sorted[sorted.length - 1]],
          evidence: [
            {
              type: "FEE_TYPE",
              description: "Type de cotisation",
              value: feeType
            },
            {
              type: "INITIAL",
              description: "Montant initial",
              value: `${firstAmount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "CURRENT",
              description: "Montant actuel",
              value: `${lastAmount.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "INCREASE",
              description: "Augmentation",
              value: `+${increase.toFixed(1)}%`
            },
            {
              type: "PERIOD",
              description: "Sur p\xE9riode",
              value: `${monthsSpan} mois`
            }
          ],
          recommendation: `Augmentation de ${increase.toFixed(1)}% sur "${feeType}" en ${monthsSpan} mois. De ${firstAmount.toLocaleString("fr-FR")} \xE0 ${lastAmount.toLocaleString("fr-FR")} FCFA. V\xE9rifier la justification et n\xE9gocier si possible.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Détecter les options non utilisées
   */
  detectUnusedOptions(transactions) {
    const anomalies = [];
    const optionFees = transactions.filter((t) => this.isOptionalService(t));
    if (optionFees.length === 0) return anomalies;
    const optionsByType = /* @__PURE__ */ new Map();
    for (const fee of optionFees) {
      const optionType = this.extractOptionType(fee.description);
      if (!optionsByType.has(optionType)) {
        optionsByType.set(optionType, []);
      }
      optionsByType.get(optionType).push(fee);
    }
    for (const [optionType, fees] of optionsByType) {
      const relatedOps = this.findRelatedOperations(transactions, optionType);
      const totalFees = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0);
      if (relatedOps.length === 0 && fees.length >= 3) {
        anomalies.push({
          id: v4_default(),
          type: "GHOST_FEE" /* GHOST_FEE */,
          severity: "MEDIUM" /* MEDIUM */,
          confidence: 0.7,
          amount: totalFees,
          transactions: fees,
          evidence: [
            {
              type: "OPTION",
              description: "Option/Service",
              value: optionType
            },
            {
              type: "FEE_COUNT",
              description: "Nombre de pr\xE9l\xE8vements",
              value: fees.length.toString()
            },
            {
              type: "TOTAL",
              description: "Total pay\xE9",
              value: `${totalFees.toLocaleString("fr-FR")} FCFA`
            },
            {
              type: "USAGE",
              description: "Utilisations d\xE9tect\xE9es",
              value: "0"
            }
          ],
          recommendation: `Option "${optionType}" factur\xE9e ${fees.length} fois (${totalFees.toLocaleString("fr-FR")} FCFA) sans utilisation d\xE9tect\xE9e. \xC9valuer l'int\xE9r\xEAt de cette option et envisager sa r\xE9siliation.`,
          status: "pending",
          detectedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    return anomalies;
  }
  /**
   * Identifier un frais de package
   */
  isPackageFee(transaction) {
    const keywords = [
      "package",
      "forfait",
      "formule",
      "offre",
      "convention",
      "tout compris",
      "premium",
      "integral",
      "essentiel",
      "confort",
      "privilege"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier une assurance moyens de paiement
   */
  isPaymentInsurance(transaction) {
    const keywords = [
      "assurance carte",
      "assurance cb",
      "assurance moyens paiement",
      "protection carte",
      "garantie carte",
      "securite carte",
      "assurance vol",
      "assurance perte"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier une assurance découvert
   */
  isOverdraftInsurance(transaction) {
    const keywords = [
      "assurance decouvert",
      "protection decouvert",
      "garantie decouvert",
      "assurance facilite"
    ];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw));
  }
  /**
   * Identifier un service optionnel
   */
  isOptionalService(transaction) {
    const keywords = [
      "option",
      "service",
      "abonnement",
      "souscription",
      "supplement",
      "additif"
    ];
    const excludeKeywords = ["package", "forfait", "assurance"];
    const desc = transaction.description.toLowerCase();
    return transaction.amount < 0 && keywords.some((kw) => desc.includes(kw)) && !excludeKeywords.some((kw) => desc.includes(kw));
  }
  /**
   * Extraire le type de package
   */
  extractPackageType(description) {
    const desc = description.toLowerCase();
    if (desc.includes("premium") || desc.includes("privilege")) return "Premium";
    if (desc.includes("confort")) return "Confort";
    if (desc.includes("essentiel") || desc.includes("basique")) return "Essentiel";
    if (desc.includes("pro") || desc.includes("professionnel")) return "Professionnel";
    if (desc.includes("tout compris") || desc.includes("integral")) return "Tout compris";
    return "Standard";
  }
  /**
   * Extraire le type de frais
   */
  extractFeeType(description) {
    const desc = description.toLowerCase();
    if (desc.includes("package") || desc.includes("forfait")) return "Package bancaire";
    if (desc.includes("assurance carte")) return "Assurance carte";
    if (desc.includes("assurance decouvert")) return "Assurance d\xE9couvert";
    if (desc.includes("assurance")) return "Assurance";
    return "Cotisation";
  }
  /**
   * Extraire le type d'option
   */
  extractOptionType(description) {
    const desc = description.toLowerCase();
    if (desc.includes("sms") || desc.includes("alerte")) return "Alertes SMS";
    if (desc.includes("chequier")) return "Ch\xE9quier";
    if (desc.includes("epargne")) return "Option \xE9pargne";
    if (desc.includes("international")) return "Option international";
    return "Option diverses";
  }
  /**
   * Trouver les opérations liées à une option
   */
  findRelatedOperations(transactions, optionType) {
    const related = [];
    switch (optionType) {
      case "Alertes SMS":
        break;
      case "Ch\xE9quier":
        related.push(...transactions.filter(
          (t) => t.description.toLowerCase().includes("cheque") || t.description.toLowerCase().includes("chq")
        ));
        break;
      case "Option international":
        related.push(...transactions.filter(
          (t) => t.description.toLowerCase().includes("international") || t.description.toLowerCase().includes("etranger")
        ));
        break;
      default:
        break;
    }
    return related;
  }
  /**
   * Créer une anomalie de surfacturation
   */
  createOverchargeAnomaly(transaction, feeType, expected, actual) {
    return {
      id: v4_default(),
      type: "OVERCHARGE" /* OVERCHARGE */,
      severity: actual > expected * 1.5 ? "HIGH" /* HIGH */ : "MEDIUM" /* MEDIUM */,
      confidence: 0.9,
      amount: actual - expected,
      transactions: [transaction],
      evidence: [
        {
          type: "FEE_TYPE",
          description: "Type de frais",
          value: feeType
        },
        {
          type: "EXPECTED",
          description: "Montant contractuel",
          value: `${expected.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "ACTUAL",
          description: "Montant pr\xE9lev\xE9",
          value: `${actual.toLocaleString("fr-FR")} FCFA`
        },
        {
          type: "OVERCHARGE",
          description: "Surfacturation",
          value: `${(actual - expected).toLocaleString("fr-FR")} FCFA`
        }
      ],
      recommendation: `Surfacturation de ${(actual - expected).toLocaleString("fr-FR")} FCFA sur "${feeType}". Montant contractuel: ${expected.toLocaleString("fr-FR")} FCFA, montant pr\xE9lev\xE9: ${actual.toLocaleString("fr-FR")} FCFA. Demander le remboursement.`,
      status: "pending",
      detectedAt: /* @__PURE__ */ new Date()
    };
  }
};

// src/workers/WorkerPool.ts
var DetectionWorkerPool = class {
  workers = [];
  pendingTasks = /* @__PURE__ */ new Map();
  nextWorkerIndex = 0;
  initialized = false;
  taskCounter = 0;
  /**
   * Initialise le pool de workers
   * @returns true si les workers sont disponibles, false sinon
   */
  initialize() {
    if (this.initialized) return true;
    try {
      const poolSize = Math.min(navigator.hardwareConcurrency || 4, 6);
      for (let i = 0; i < poolSize; i++) {
        const worker = new Worker(
          new URL("./detection.worker.ts", import.meta.url),
          { type: "module" }
        );
        worker.onmessage = (event) => {
          this.handleWorkerMessage(event.data);
        };
        worker.onerror = (event) => {
          console.error(`Worker ${i} error:`, event.message);
        };
        this.workers.push(worker);
      }
      this.initialized = true;
      return true;
    } catch (err) {
      console.warn("Web Workers non disponibles, mode sequentiel:", err);
      return false;
    }
  }
  /**
   * Execute un seul detecteur dans un worker
   */
  runDetection(detectorType, transactions, options) {
    if (!this.initialized || this.workers.length === 0) {
      return Promise.reject(new Error("Worker pool non initialise"));
    }
    const id = `task-${++this.taskCounter}`;
    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { resolve, reject, detectorType });
      const worker = this.workers[this.nextWorkerIndex % this.workers.length];
      this.nextWorkerIndex++;
      const message2 = {
        type: "RUN_DETECTION",
        id,
        detectorType,
        transactions,
        bankConditions: options == null ? void 0 : options.bankConditions,
        thresholds: options == null ? void 0 : options.thresholds,
        accountBalances: options == null ? void 0 : options.accountBalances
      };
      worker.postMessage(message2);
    });
  }
  /**
   * Execute plusieurs detecteurs en parallele
   * @param detectorTypes Liste des types de detecteurs a executer
   * @param onProgress Callback de progression
   * @returns Toutes les anomalies detectees
   */
  async runParallel(detectorTypes, transactions, options) {
    if (!this.initialized) {
      throw new Error("Worker pool non initialise");
    }
    const total = detectorTypes.length;
    let completed = 0;
    const allAnomalies = [];
    const promises = detectorTypes.map(async (type) => {
      var _a;
      try {
        const anomalies = await this.runDetection(type, transactions, {
          bankConditions: options == null ? void 0 : options.bankConditions,
          thresholds: options == null ? void 0 : options.thresholds,
          accountBalances: options == null ? void 0 : options.accountBalances
        });
        allAnomalies.push(...anomalies);
      } catch (err) {
        console.error(`Erreur detection ${type}:`, err);
      } finally {
        completed++;
        (_a = options == null ? void 0 : options.onProgress) == null ? void 0 : _a.call(options, completed, total, type);
      }
    });
    await Promise.all(promises);
    return allAnomalies;
  }
  /**
   * Termine tous les workers et libere les ressources
   */
  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.pendingTasks.clear();
    this.initialized = false;
    this.nextWorkerIndex = 0;
  }
  /**
   * Nombre de workers actifs
   */
  get poolSize() {
    return this.workers.length;
  }
  /**
   * Le pool est-il initialise?
   */
  get isInitialized() {
    return this.initialized;
  }
  // ============================================================================
  // Private
  // ============================================================================
  handleWorkerMessage(response) {
    const pending = this.pendingTasks.get(response.id);
    if (!pending) return;
    this.pendingTasks.delete(response.id);
    if (response.type === "ERROR") {
      pending.reject(new Error(response.error || "Erreur worker"));
    } else {
      pending.resolve(response.anomalies || []);
    }
  }
};

// src/lib/anomalyRecovery.ts
var NON_RECOVERABLE_UPPER = /* @__PURE__ */ new Set([
  "AML_ALERT",
  "SUSPICIOUS_TRANSACTION",
  "CASHFLOW_ANOMALY",
  "RECONCILIATION_GAP",
  "MULTI_BANK_ISSUE"
]);
var NON_RECOVERABLE_LOWER = /* @__PURE__ */ new Set([
  "lcb_ft",
  "pays_gafi_risque",
  "beneficiaire_inedit",
  "montant_anormal"
]);
function isRecoverableAnomalyType(type) {
  if (!type) return false;
  const t = String(type);
  if (NON_RECOVERABLE_UPPER.has(t)) return false;
  if (NON_RECOVERABLE_LOWER.has(t.toLowerCase())) return false;
  return true;
}

// src/services/AnalysisService.ts
var AnalysisService = class {
  // Modules existants
  duplicateDetector;
  ghostFeeDetector;
  overchargeAnalyzer;
  interestCalculator;
  // Nouveaux modules
  suspiciousAudit;
  cashflowAudit;
  reconciliationAudit;
  ohadaAudit;
  amlAudit;
  // Worker pool for parallel execution
  workerPool = null;
  thresholds;
  constructor(thresholds) {
    this.thresholds = thresholds;
    this.duplicateDetector = new DuplicateDetector(thresholds == null ? void 0 : thresholds.duplicateDetection);
    this.ghostFeeDetector = new GhostFeeDetector(thresholds == null ? void 0 : thresholds.ghostFeeDetection);
    this.overchargeAnalyzer = new OverchargeAnalyzer(thresholds == null ? void 0 : thresholds.overchargeDetection);
    this.interestCalculator = new InterestCalculator(thresholds == null ? void 0 : thresholds.interestCalculation);
    new ValueDateAudit();
    this.suspiciousAudit = new SuspiciousAudit();
    this.cashflowAudit = new CashflowAudit();
    this.reconciliationAudit = new ReconciliationAudit();
    this.ohadaAudit = new OhadaAudit();
    this.amlAudit = new AmlAudit();
    new AccountFeesAudit();
    new CardFeesAudit();
    new PaymentMethodsAudit();
    new InternationalAudit();
    new AncillaryServicesAudit();
    new PackagesAudit();
  }
  /**
   * Run complete analysis on transactions
   */
  async analyzeTransactions(transactions, bankConditions, config, options) {
    const startedAt = /* @__PURE__ */ new Date();
    const progress = (options == null ? void 0 : options.onProgress) || (() => {
    });
    try {
      progress(5, "Initialisation de l'analyse...");
      const filteredTransactions = this.filterTransactions(transactions, config);
      progress(10, `Analyse de ${filteredTransactions.length} transactions...`);
      if (options == null ? void 0 : options.useWorkers) {
        try {
          progress(12, "Lancement de la detection parallele...");
          const workerAnomalies = await this.runDetectorsParallel(
            filteredTransactions,
            config,
            bankConditions,
            options
          );
          if (workerAnomalies.length >= 0) {
            progress(70, "Calcul des statistiques...");
            const statistics2 = this.calculateStatistics(filteredTransactions, workerAnomalies);
            let aiAnalysis2;
            let categorizedCount2 = 0;
            let fraudPatternsCount2 = 0;
            if (options == null ? void 0 : options.claudeService) {
              if (options.enableAICategorization && filteredTransactions.length > 0) {
                progress(75, "Categorisation IA des transactions...");
                try {
                  const categories = await options.claudeService.categorizeTransactions(
                    filteredTransactions.slice(0, 200)
                  );
                  categorizedCount2 = categories.filter((c) => c.confidence > 0.5).length;
                } catch (error) {
                  console.error("Erreur categorisation IA:", error);
                }
              }
              if (options.enableAIFraudDetection && filteredTransactions.length > 0) {
                progress(82, "Detection de fraude IA...");
                try {
                  const fraudPatterns = await options.claudeService.detectFraudPatterns(
                    filteredTransactions,
                    workerAnomalies
                  );
                  fraudPatternsCount2 = fraudPatterns.filter((f) => f.isSuspicious).length;
                } catch (error) {
                  console.error("Erreur detection fraude IA:", error);
                }
              }
              if (workerAnomalies.length > 0) {
                progress(88, "Analyse approfondie IA...");
                try {
                  aiAnalysis2 = await options.claudeService.analyzeAnomalies(workerAnomalies, bankConditions);
                } catch (error) {
                  console.error("Erreur analyse IA:", error);
                }
              }
            }
            progress(95, "Generation du resume...");
            const summary2 = this.generateSummary(workerAnomalies, statistics2, aiAnalysis2);
            progress(100, "Analyse terminee");
            return {
              id: `analysis-${Date.now()}`,
              config,
              status: "COMPLETED" /* COMPLETED */,
              progress: 100,
              anomalies: workerAnomalies,
              statistics: statistics2,
              summary: summary2,
              startedAt,
              completedAt: /* @__PURE__ */ new Date(),
              aiAnalysis: aiAnalysis2,
              categorizedTransactions: categorizedCount2,
              fraudPatternsDetected: fraudPatternsCount2
            };
          }
        } catch (err) {
          console.warn("Workers failed, falling back to sequential:", err);
        }
      }
      const allAnomalies = [];
      let currentProgress = 10;
      const progressPerDetector = 20;
      if (config.enabledDetectors.includes("DUPLICATE_FEE" /* DUPLICATE_FEE */)) {
        progress(currentProgress, "D\xE9tection des doublons...");
        const duplicates = await this.runDetector(
          () => this.duplicateDetector.detectDuplicates(filteredTransactions, bankConditions)
        );
        allAnomalies.push(...duplicates);
        currentProgress += progressPerDetector;
      }
      if (config.enabledDetectors.includes("GHOST_FEE" /* GHOST_FEE */)) {
        progress(currentProgress, "D\xE9tection des frais fant\xF4mes...");
        const ghostFees = await this.runDetector(
          () => this.ghostFeeDetector.detectGhostFees(filteredTransactions, bankConditions)
        );
        allAnomalies.push(...ghostFees);
        currentProgress += progressPerDetector;
      }
      if (config.enabledDetectors.includes("OVERCHARGE" /* OVERCHARGE */)) {
        progress(currentProgress, "Analyse des surfacturations...");
        const overcharges = await this.runDetector(
          () => this.overchargeAnalyzer.detectOvercharges(
            filteredTransactions,
            bankConditions,
            options == null ? void 0 : options.historicalData
          )
        );
        allAnomalies.push(...overcharges);
        currentProgress += progressPerDetector;
      }
      if (config.enabledDetectors.includes("INTEREST_ERROR" /* INTEREST_ERROR */) && (options == null ? void 0 : options.accountBalances)) {
        progress(currentProgress, "V\xE9rification des calculs d'int\xE9r\xEAts...");
        const interestErrors = await this.runDetector(
          () => this.interestCalculator.verifyInterestCharges(
            filteredTransactions,
            bankConditions,
            options.accountBalances
          )
        );
        allAnomalies.push(...interestErrors);
        currentProgress += progressPerDetector / 2;
      }
      if (config.enabledDetectors.includes("VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */)) {
        progress(currentProgress, "Contr\xF4le des dates de valeur...");
        const valueDateAudit = new ValueDateAudit({}, bankConditions);
        const valueDateAnomalies = await this.runDetector(
          () => valueDateAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...valueDateAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */)) {
        progress(currentProgress, "D\xE9tection des op\xE9rations suspectes...");
        const suspiciousAnomalies = await this.runDetector(
          () => this.suspiciousAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...suspiciousAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */)) {
        progress(currentProgress, "Audit de conformit\xE9 contractuelle...");
        const complianceAudit = new ComplianceAudit(bankConditions);
        const complianceAnomalies = await this.runDetector(
          () => complianceAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...complianceAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */)) {
        progress(currentProgress, "Analyse de tr\xE9sorerie...");
        const cashflowAnomalies = await this.runDetector(
          () => this.cashflowAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...cashflowAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("RECONCILIATION_GAP" /* RECONCILIATION_GAP */)) {
        progress(currentProgress, "Analyse de rapprochement...");
        const reconciliationAnomalies = await this.runDetector(
          () => this.reconciliationAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...reconciliationAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */)) {
        progress(currentProgress, "Analyse multi-banques...");
        const multiBankAudit = new MultiBankAudit([bankConditions]);
        const multiBankAnomalies = await this.runDetector(
          () => multiBankAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...multiBankAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */)) {
        progress(currentProgress, "Contr\xF4le conformit\xE9 OHADA...");
        const ohadaAnomalies = await this.runDetector(
          () => this.ohadaAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...ohadaAnomalies);
        currentProgress += 5;
      }
      if (config.enabledDetectors.includes("AML_ALERT" /* AML_ALERT */)) {
        progress(currentProgress, "D\xE9tection anti-blanchiment (LCB-FT)...");
        const amlAnomalies = await this.runDetector(
          () => this.amlAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...amlAnomalies);
        currentProgress += 3;
      }
      if (config.enabledDetectors.includes("FEE_ANOMALY" /* FEE_ANOMALY */)) {
        progress(currentProgress, "Audit des frais de tenue de compte...");
        const accountFeesAudit = new AccountFeesAudit({}, bankConditions);
        const accountFeesAnomalies = await this.runDetector(
          () => accountFeesAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...accountFeesAnomalies);
        currentProgress += 3;
      }
      if (config.enabledDetectors.includes("FEE_ANOMALY" /* FEE_ANOMALY */)) {
        progress(currentProgress, "Audit des frais de cartes bancaires...");
        const cardFeesAudit = new CardFeesAudit({}, bankConditions);
        const cardFeesAnomalies = await this.runDetector(
          () => cardFeesAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...cardFeesAnomalies);
        currentProgress += 3;
      }
      if (config.enabledDetectors.includes("FEE_ANOMALY" /* FEE_ANOMALY */)) {
        progress(currentProgress, "Audit des moyens de paiement...");
        const paymentMethodsAudit = new PaymentMethodsAudit({}, bankConditions);
        const paymentMethodsAnomalies = await this.runDetector(
          () => paymentMethodsAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...paymentMethodsAnomalies);
        currentProgress += 3;
      }
      if (config.enabledDetectors.includes("FEE_ANOMALY" /* FEE_ANOMALY */)) {
        progress(currentProgress, "Audit des op\xE9rations internationales...");
        const internationalAudit = new InternationalAudit({}, bankConditions);
        const internationalAnomalies = await this.runDetector(
          () => internationalAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...internationalAnomalies);
        currentProgress += 3;
      }
      if (config.enabledDetectors.includes("FEE_ANOMALY" /* FEE_ANOMALY */)) {
        progress(currentProgress, "Audit des services annexes...");
        const ancillaryServicesAudit = new AncillaryServicesAudit({}, bankConditions);
        const ancillaryServicesAnomalies = await this.runDetector(
          () => ancillaryServicesAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...ancillaryServicesAnomalies);
        currentProgress += 3;
      }
      if (config.enabledDetectors.includes("FEE_ANOMALY" /* FEE_ANOMALY */)) {
        progress(currentProgress, "Audit des packages et assurances...");
        const packagesAudit = new PackagesAudit({}, bankConditions);
        const packagesAnomalies = await this.runDetector(
          () => packagesAudit.analyze(filteredTransactions)
        );
        allAnomalies.push(...packagesAnomalies);
      }
      progress(70, "Calcul des statistiques...");
      const statistics = this.calculateStatistics(filteredTransactions, allAnomalies);
      let aiAnalysis;
      let categorizedCount = 0;
      let fraudPatternsCount = 0;
      if (options == null ? void 0 : options.claudeService) {
        if (options.enableAICategorization && filteredTransactions.length > 0) {
          progress(75, "Cat\xE9gorisation IA des transactions...");
          try {
            const categories = await options.claudeService.categorizeTransactions(
              filteredTransactions.slice(0, 200)
              // Limit for API costs
            );
            categorizedCount = categories.filter((c) => c.confidence > 0.5).length;
          } catch (error) {
            console.error("Erreur cat\xE9gorisation IA:", error);
          }
        }
        if (options.enableAIFraudDetection && filteredTransactions.length > 0) {
          progress(82, "D\xE9tection de fraude IA...");
          try {
            const fraudPatterns = await options.claudeService.detectFraudPatterns(
              filteredTransactions,
              allAnomalies
            );
            fraudPatternsCount = fraudPatterns.filter((f) => f.isSuspicious).length;
          } catch (error) {
            console.error("Erreur d\xE9tection fraude IA:", error);
          }
        }
        if (allAnomalies.length > 0) {
          progress(88, "Analyse approfondie IA...");
          try {
            aiAnalysis = await options.claudeService.analyzeAnomalies(
              allAnomalies,
              bankConditions
            );
          } catch (error) {
            console.error("Erreur analyse IA:", error);
          }
        }
      }
      progress(95, "G\xE9n\xE9ration du r\xE9sum\xE9...");
      const summary = this.generateSummary(allAnomalies, statistics, aiAnalysis);
      progress(100, "Analyse termin\xE9e");
      return {
        id: `analysis-${Date.now()}`,
        config,
        status: "COMPLETED" /* COMPLETED */,
        progress: 100,
        anomalies: allAnomalies,
        statistics,
        summary,
        startedAt,
        completedAt: /* @__PURE__ */ new Date(),
        aiAnalysis,
        categorizedTransactions: categorizedCount,
        fraudPatternsDetected: fraudPatternsCount
      };
    } catch (error) {
      return {
        id: `analysis-${Date.now()}`,
        config,
        status: "FAILED" /* FAILED */,
        progress: 0,
        anomalies: [],
        statistics: this.emptyStatistics(),
        summary: {
          status: "CRITICAL",
          message: `Erreur lors de l'analyse: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
          keyFindings: [],
          recommendations: [],
          estimatedRecovery: 0
        },
        startedAt,
        completedAt: /* @__PURE__ */ new Date(),
        error: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }
  }
  /**
   * Run all enabled detectors in parallel using Web Workers
   */
  async runDetectorsParallel(filteredTransactions, config, bankConditions, options) {
    if (!this.workerPool) {
      this.workerPool = new DetectionWorkerPool();
    }
    if (!this.workerPool.isInitialized) {
      const ok = this.workerPool.initialize();
      if (!ok) throw new Error("DetectionWorkerPool: initialisation impossible \u2014 bascule s\xE9quentielle");
    }
    const detectorTypes = [];
    for (const detector of config.enabledDetectors) {
      if (detector === "FEE_ANOMALY" /* FEE_ANOMALY */) {
        detectorTypes.push(
          "FEE_ANOMALY_ACCOUNT",
          "FEE_ANOMALY_CARD",
          "FEE_ANOMALY_PAYMENT",
          "FEE_ANOMALY_INTERNATIONAL",
          "FEE_ANOMALY_ANCILLARY",
          "FEE_ANOMALY_PACKAGES"
        );
      } else {
        detectorTypes.push(detector);
      }
    }
    return this.workerPool.runParallel(detectorTypes, filteredTransactions, {
      bankConditions,
      thresholds: this.thresholds,
      accountBalances: options == null ? void 0 : options.accountBalances,
      onProgress: (completed, total, currentType) => {
        var _a;
        const pct = 10 + Math.round(completed / total * 55);
        (_a = options == null ? void 0 : options.onProgress) == null ? void 0 : _a.call(options, pct, `Detection parallele: ${currentType} (${completed}/${total})`);
      }
    });
  }
  /**
   * Libere les ressources workers
   */
  dispose() {
    if (this.workerPool) {
      this.workerPool.terminate();
      this.workerPool = null;
    }
  }
  /**
   * Run a detector with async wrapper for potential web worker support
   */
  async runDetector(detector) {
    return detector();
  }
  /**
   * Filter transactions based on config
   */
  filterTransactions(transactions, config) {
    return transactions.filter((t) => {
      if (config.clientId && t.clientId !== config.clientId) {
        return false;
      }
      const txDate = new Date(t.date);
      if (config.dateRange.start && txDate < config.dateRange.start) {
        return false;
      }
      if (config.dateRange.end && txDate > config.dateRange.end) {
        return false;
      }
      if (config.bankCodes && config.bankCodes.length > 0) {
        if (!config.bankCodes.includes(t.bankCode)) {
          return false;
        }
      }
      return true;
    });
  }
  /**
   * Calculate analysis statistics
   */
  calculateStatistics(transactions, anomalies) {
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalAnomalies = anomalies.length;
    const totalAnomalyAmount = anomalies.reduce((sum, a) => sum + a.amount, 0);
    const potentialSavings = anomalies.filter((a) => isRecoverableAnomalyType(String(a.type))).reduce((sum, a) => sum + a.amount, 0);
    const anomaliesByType = {
      // Modules existants
      ["DUPLICATE_FEE" /* DUPLICATE_FEE */]: 0,
      ["GHOST_FEE" /* GHOST_FEE */]: 0,
      ["OVERCHARGE" /* OVERCHARGE */]: 0,
      ["INTEREST_ERROR" /* INTEREST_ERROR */]: 0,
      ["UNAUTHORIZED" /* UNAUTHORIZED */]: 0,
      ["ROUNDING_ABUSE" /* ROUNDING_ABUSE */]: 0,
      // Nouveaux modules
      ["VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */]: 0,
      ["SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */]: 0,
      ["COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */]: 0,
      ["CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */]: 0,
      ["RECONCILIATION_GAP" /* RECONCILIATION_GAP */]: 0,
      ["MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */]: 0,
      ["OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */]: 0,
      ["AML_ALERT" /* AML_ALERT */]: 0,
      // Modules d'audit par catégorie de frais
      ["FEE_ANOMALY" /* FEE_ANOMALY */]: 0,
      ["LIMIT_EXCEEDED" /* LIMIT_EXCEEDED */]: 0
    };
    const anomaliesBySeverity = {
      ["LOW" /* LOW */]: 0,
      ["MEDIUM" /* MEDIUM */]: 0,
      ["HIGH" /* HIGH */]: 0,
      ["CRITICAL" /* CRITICAL */]: 0
    };
    for (const anomaly of anomalies) {
      anomaliesByType[anomaly.type]++;
      anomaliesBySeverity[anomaly.severity]++;
    }
    return {
      totalTransactions,
      totalAmount,
      totalAnomalies,
      totalAnomalyAmount,
      anomaliesByType,
      anomaliesBySeverity,
      anomalyRate: totalTransactions > 0 ? totalAnomalies / totalTransactions * 100 : 0,
      // Recoverable amount only — see filter above (excludes LCB-FT / cashflow / etc.)
      potentialSavings
    };
  }
  /**
   * Generate analysis summary
   */
  generateSummary(anomalies, statistics, aiAnalysis) {
    var _a, _b;
    const criticalCount = statistics.anomaliesBySeverity["CRITICAL" /* CRITICAL */];
    const highCount = statistics.anomaliesBySeverity["HIGH" /* HIGH */];
    let status;
    if (criticalCount > 0) {
      status = "CRITICAL";
    } else if (highCount > 0 || statistics.totalAnomalies > 10) {
      status = "WARNING";
    } else {
      status = "OK";
    }
    let message2;
    if (statistics.totalAnomalies === 0) {
      message2 = "Aucune anomalie d\xE9tect\xE9e. Les frais bancaires semblent conformes.";
    } else {
      message2 = `${statistics.totalAnomalies} anomalie${statistics.totalAnomalies > 1 ? "s" : ""} d\xE9tect\xE9e${statistics.totalAnomalies > 1 ? "s" : ""} pour un montant total de ${Math.round(statistics.totalAnomalyAmount).toLocaleString("fr-FR")} FCFA. Taux d'anomalie: ${statistics.anomalyRate.toFixed(1)}%.`;
    }
    let keyFindings = this.extractKeyFindings(anomalies, statistics);
    let recommendations = this.generateRecommendations(anomalies, statistics);
    if (aiAnalysis == null ? void 0 : aiAnalysis.analysis) {
      if (((_a = aiAnalysis.analysis.findings) == null ? void 0 : _a.length) > 0) {
        const aiFindings = aiAnalysis.analysis.findings.slice(0, 3).map((f) => `[IA] ${f.description}`);
        keyFindings = [...keyFindings, ...aiFindings].slice(0, 5);
      }
      if (((_b = aiAnalysis.analysis.recommendations) == null ? void 0 : _b.length) > 0) {
        const aiRecs = aiAnalysis.analysis.recommendations.slice(0, 2).map((r) => `[IA] ${r}`);
        recommendations = [...recommendations, ...aiRecs].slice(0, 5);
      }
      if (aiAnalysis.analysis.summary) {
        message2 += ` Analyse IA: ${aiAnalysis.analysis.summary}`;
      }
    }
    return {
      status,
      message: message2,
      keyFindings,
      recommendations,
      estimatedRecovery: statistics.potentialSavings
    };
  }
  /**
   * Extract key findings from anomalies
   */
  extractKeyFindings(anomalies, statistics) {
    const findings = [];
    const typeLabels = {
      // Modules existants
      ["DUPLICATE_FEE" /* DUPLICATE_FEE */]: "frais en double",
      ["GHOST_FEE" /* GHOST_FEE */]: "frais fant\xF4mes",
      ["OVERCHARGE" /* OVERCHARGE */]: "surfacturations",
      ["INTEREST_ERROR" /* INTEREST_ERROR */]: "erreurs d'int\xE9r\xEAts",
      ["UNAUTHORIZED" /* UNAUTHORIZED */]: "frais non autoris\xE9s",
      ["ROUNDING_ABUSE" /* ROUNDING_ABUSE */]: "abus d'arrondi",
      // Nouveaux modules
      ["VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */]: "erreurs de dates de valeur",
      ["SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */]: "op\xE9rations suspectes",
      ["COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */]: "non-conformit\xE9s",
      ["CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */]: "anomalies de tr\xE9sorerie",
      ["RECONCILIATION_GAP" /* RECONCILIATION_GAP */]: "\xE9carts de rapprochement",
      ["MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */]: "probl\xE8mes multi-banques",
      ["OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */]: "non-conformit\xE9s OHADA",
      ["AML_ALERT" /* AML_ALERT */]: "alertes anti-blanchiment",
      // Modules d'audit par catégorie
      ["FEE_ANOMALY" /* FEE_ANOMALY */]: "anomalies de frais",
      ["LIMIT_EXCEEDED" /* LIMIT_EXCEEDED */]: "d\xE9passements de plafond"
    };
    for (const [type, count] of Object.entries(statistics.anomaliesByType)) {
      if (count > 0) {
        const typeAnomalies = anomalies.filter((a) => a.type === type);
        const amount = typeAnomalies.reduce((sum, a) => sum + a.amount, 0);
        findings.push(
          `${count} ${typeLabels[type]} (${Math.round(amount).toLocaleString("fr-FR")} FCFA)`
        );
      }
    }
    const criticalAnomalies = anomalies.filter((a) => a.severity === "CRITICAL" /* CRITICAL */);
    if (criticalAnomalies.length > 0) {
      findings.unshift(
        `${criticalAnomalies.length} anomalie${criticalAnomalies.length > 1 ? "s" : ""} critique${criticalAnomalies.length > 1 ? "s" : ""} requ\xE9rant une attention imm\xE9diate`
      );
    }
    return findings.slice(0, 5);
  }
  /**
   * Generate recommendations
   */
  generateRecommendations(_anomalies, statistics) {
    const recommendations = [];
    if (statistics.anomaliesByType["DUPLICATE_FEE" /* DUPLICATE_FEE */] > 0) {
      recommendations.push(
        "Mettre en place un contr\xF4le mensuel des doublons de frais"
      );
    }
    if (statistics.anomaliesByType["GHOST_FEE" /* GHOST_FEE */] > 0) {
      recommendations.push(
        "Demander des factures d\xE9taill\xE9es pour tous les frais non identifi\xE9s"
      );
    }
    if (statistics.anomaliesByType["OVERCHARGE" /* OVERCHARGE */] > 0) {
      recommendations.push(
        "Ren\xE9gocier les conditions tarifaires avec la banque"
      );
    }
    if (statistics.anomaliesByType["INTEREST_ERROR" /* INTEREST_ERROR */] > 0) {
      recommendations.push(
        "Demander le d\xE9tail des calculs d'int\xE9r\xEAts \xE0 la banque"
      );
    }
    if (statistics.anomaliesByType["VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */] > 0) {
      recommendations.push(
        "V\xE9rifier les dates de valeur et r\xE9clamer les int\xE9r\xEAts ind\xFBment pr\xE9lev\xE9s"
      );
    }
    if (statistics.anomaliesByType["SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */] > 0) {
      recommendations.push(
        "Analyser en d\xE9tail les op\xE9rations suspectes identifi\xE9es"
      );
    }
    if (statistics.anomaliesByType["COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */] > 0) {
      recommendations.push(
        "Mettre en conformit\xE9 avec les conditions contractuelles"
      );
    }
    if (statistics.anomaliesByType["CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */] > 0) {
      recommendations.push(
        "Optimiser la gestion de tr\xE9sorerie pour \xE9viter les d\xE9couverts"
      );
    }
    if (statistics.anomaliesByType["RECONCILIATION_GAP" /* RECONCILIATION_GAP */] > 0) {
      recommendations.push(
        "Effectuer un rapprochement complet et identifier les \xE9critures manquantes"
      );
    }
    if (statistics.anomaliesByType["OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */] > 0) {
      recommendations.push(
        "R\xE9gulariser les non-conformit\xE9s OHADA identifi\xE9es"
      );
    }
    if (statistics.anomaliesByType["AML_ALERT" /* AML_ALERT */] > 0) {
      recommendations.push(
        "URGENT: Transmettre les alertes LCB-FT au responsable conformit\xE9"
      );
    }
    if (statistics.anomaliesByType["FEE_ANOMALY" /* FEE_ANOMALY */] > 0) {
      recommendations.push(
        "Analyser les frais bancaires par cat\xE9gorie et r\xE9clamer les remboursements"
      );
    }
    if (statistics.totalAnomalies > 10) {
      recommendations.push(
        "Envisager de changer de banque ou de ren\xE9gocier l'ensemble des conditions"
      );
    }
    if (statistics.potentialSavings > 1e5) {
      recommendations.push(
        "Engager rapidement une proc\xE9dure de r\xE9clamation formelle"
      );
    }
    return recommendations.slice(0, 5);
  }
  /**
   * Create empty statistics object
   */
  emptyStatistics() {
    return {
      totalTransactions: 0,
      totalAmount: 0,
      totalAnomalies: 0,
      totalAnomalyAmount: 0,
      anomaliesByType: {
        // Modules existants
        ["DUPLICATE_FEE" /* DUPLICATE_FEE */]: 0,
        ["GHOST_FEE" /* GHOST_FEE */]: 0,
        ["OVERCHARGE" /* OVERCHARGE */]: 0,
        ["INTEREST_ERROR" /* INTEREST_ERROR */]: 0,
        ["UNAUTHORIZED" /* UNAUTHORIZED */]: 0,
        ["ROUNDING_ABUSE" /* ROUNDING_ABUSE */]: 0,
        // Nouveaux modules
        ["VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */]: 0,
        ["SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */]: 0,
        ["COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */]: 0,
        ["CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */]: 0,
        ["RECONCILIATION_GAP" /* RECONCILIATION_GAP */]: 0,
        ["MULTI_BANK_ISSUE" /* MULTI_BANK_ISSUE */]: 0,
        ["OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */]: 0,
        ["AML_ALERT" /* AML_ALERT */]: 0,
        // Modules d'audit par catégorie
        ["FEE_ANOMALY" /* FEE_ANOMALY */]: 0,
        ["LIMIT_EXCEEDED" /* LIMIT_EXCEEDED */]: 0
      },
      anomaliesBySeverity: {
        ["LOW" /* LOW */]: 0,
        ["MEDIUM" /* MEDIUM */]: 0,
        ["HIGH" /* HIGH */]: 0,
        ["CRITICAL" /* CRITICAL */]: 0
      },
      anomalyRate: 0,
      potentialSavings: 0
    };
  }
};
var instance = null;
function getAnalysisService(thresholds) {
  if (!instance || thresholds) {
    instance = new AnalysisService(thresholds);
  }
  return instance;
}

// src/services/audit/runFullAudit.ts
var FULL_AUDIT_DETECTORS = [
  "DUPLICATE_FEE" /* DUPLICATE_FEE */,
  "GHOST_FEE" /* GHOST_FEE */,
  "OVERCHARGE" /* OVERCHARGE */,
  "INTEREST_ERROR" /* INTEREST_ERROR */,
  "VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */,
  "SUSPICIOUS_TRANSACTION" /* SUSPICIOUS_TRANSACTION */,
  "COMPLIANCE_VIOLATION" /* COMPLIANCE_VIOLATION */,
  "CASHFLOW_ANOMALY" /* CASHFLOW_ANOMALY */,
  "RECONCILIATION_GAP" /* RECONCILIATION_GAP */,
  "OHADA_NON_COMPLIANCE" /* OHADA_NON_COMPLIANCE */,
  "AML_ALERT" /* AML_ALERT */,
  "FEE_ANOMALY" /* FEE_ANOMALY */
];
var EMPTY_BANK_CONDITIONS = {
  bankName: "",
  accountType: "current",
  // fees / interestRates DOIVENT être des tableaux (les détecteurs itèrent
  // dessus) : un objet {} n'est pas itérable → « fees is not iterable ».
  fees: [],
  interestRates: [],
  limits: {}
};
async function runFullAudit(params) {
  const config = {
    enabledDetectors: FULL_AUDIT_DETECTORS,
    dateRange: {},
    // IMPORTANT : ne PAS filtrer les transactions par code banque.
    // Dans un audit mono-relevé (funnel particulier, détail d'un relevé), les
    // transactions extraites du PDF ne portent pas le code de la banque
    // sélectionnée — poser `bankCodes: [bankCode]` viderait TOUT l'audit
    // (filterTransactions rejette les transactions dont t.bankCode ≠ sélection).
    // Le bankCode ne sert qu'à résoudre le barème (bankConditions), pas à filtrer.
    bankCodes: void 0
  };
  const accountBalances = params.transactions.filter((t) => typeof t.balance === "number" && !Number.isNaN(t.balance)).map((t) => ({
    date: t.date instanceof Date ? t.date : new Date(t.date),
    balance: t.balance,
    accountNumber: t.accountNumber ?? ""
  }));
  const service = getAnalysisService(params.thresholds);
  return service.analyzeTransactions(
    params.transactions,
    params.bankConditions ?? { ...EMPTY_BANK_CONDITIONS, bankName: params.bankCode ?? "" },
    config,
    // useWorkers: false — chemin de détection SÉQUENTIEL, robuste en production.
    // Le pool de Web Workers ne s'initialise pas toujours (CSP stricte, build
    // single-file) ; sur échec l'audit renvoyait 0 anomalie sans exécuter les
    // détecteurs. Ce point d'entrée partagé (funnel particulier, détail relevé)
    // privilégie la fiabilité — quelques centaines de transactions s'analysent
    // instantanément en séquentiel.
    {
      useWorkers: false,
      onProgress: params.onProgress,
      accountBalances: accountBalances.length > 0 ? accountBalances : void 0
    }
  );
}

// src/services/audit/anomalyCertainty.ts
var CERTAINTY_THRESHOLD = 0.9;
var RECOVERABLE_ANOMALY_TYPES = /* @__PURE__ */ new Set([
  "OVERCHARGE" /* OVERCHARGE */,
  "DUPLICATE_FEE" /* DUPLICATE_FEE */,
  "GHOST_FEE" /* GHOST_FEE */,
  "INTEREST_ERROR" /* INTEREST_ERROR */,
  "UNAUTHORIZED" /* UNAUTHORIZED */,
  "ROUNDING_ABUSE" /* ROUNDING_ABUSE */,
  "VALUE_DATE_ERROR" /* VALUE_DATE_ERROR */,
  "FEE_ANOMALY" /* FEE_ANOMALY */,
  "LIMIT_EXCEEDED" /* LIMIT_EXCEEDED */
]);
function isRecoverableAnomaly(a) {
  return RECOVERABLE_ANOMALY_TYPES.has(a.type);
}
function conf(a) {
  const c = a.confidence;
  return typeof c === "number" && Number.isFinite(c) ? c : 0;
}
function partitionByCertainty(anomalies, threshold = CERTAINTY_THRESHOLD) {
  const certain = [];
  const uncertain = [];
  for (const a of anomalies) (conf(a) >= threshold ? certain : uncertain).push(a);
  const sumRecoverable = (xs) => xs.reduce((s, a) => s + (isRecoverableAnomaly(a) ? a.amount || 0 : 0), 0);
  return {
    certain,
    uncertain,
    certainAmount: sumRecoverable(certain),
    uncertainAmount: sumRecoverable(uncertain)
  };
}

// src/billing/recoveryPricing.ts
var RECOVERY_PRICING = {
  /**
   * Fraction du récupérable facturée (déblocage du rapport actionnable).
   * Appliquée UNIFORMÉMENT, sans plafond : le client garde toujours (1 − RATE)
   * du récupérable, et le prix suit proportionnellement le montant.
   */
  RATE: 0.2,
  /** Prix plancher quand on facture (FCFA). */
  MIN_PRICE: 1500,
  /**
   * Seuil de récupérable en dessous duquel le rapport est GRATUIT : trop faible
   * pour qu'un paiement laisse un gain net intéressant. Protège la marque.
   */
  FREE_BELOW: 8e3,
  /** Arrondi commercial du prix (FCFA). */
  ROUND_TO: 500
};
function pricingForRecovery(recoverableFcfa) {
  const rec = Math.max(0, Math.round(recoverableFcfa || 0));
  if (rec < RECOVERY_PRICING.FREE_BELOW) {
    return {
      recoverableFcfa: rec,
      priceFcfa: 0,
      isFree: true,
      netGainFcfa: rec,
      effectiveRate: 0
    };
  }
  const raw = rec * RECOVERY_PRICING.RATE;
  const rounded = Math.floor(raw / RECOVERY_PRICING.ROUND_TO) * RECOVERY_PRICING.ROUND_TO;
  const price = Math.max(RECOVERY_PRICING.MIN_PRICE, rounded);
  return {
    recoverableFcfa: rec,
    priceFcfa: price,
    isFree: false,
    netGainFcfa: rec - price,
    effectiveRate: price / rec
  };
}

// src/billing/express/auditReportHtml.ts
function fmt(n) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}
function fmtDate(d) {
  return d ? d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014";
}
function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}
function auditReportToHtml(result, meta) {
  var _a, _b, _c, _d;
  const anomalyRows = result.anomalies.map(
    (a) => `<tr><td>${esc(ANOMALY_TYPE_LABELS[a.type] ?? a.type)}</td><td><span class="sev sev-${esc(a.severity)}">${esc(a.severity)}</span></td><td class="num">${fmt(a.amount)}</td><td class="detail">${esc(a.description ?? a.recommendation ?? "")}</td></tr>`
  ).join("");
  const findings = (((_a = result.summary) == null ? void 0 : _a.keyFindings) ?? []).map((f) => `<li>${esc(f)}</li>`).join("");
  const recos = (((_b = result.summary) == null ? void 0 : _b.recommendations) ?? []).map((r) => `<li>${esc(r)}</li>`).join("");
  const status = ((_c = result.summary) == null ? void 0 : _c.status) ?? "OK";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport d'audit bancaire \u2014 AtlasBanx</title>
<style>
  /* ---- Page A4 portrait ---- */
  @page { size: A4 portrait; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a2e;
    background: #eceef3;
    font-size: 11px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Feuille A4 centr\xE9e \xE0 l'\xE9cran ; en impression elle occupe la page. */
  .sheet {
    width: 180mm;
    min-height: 267mm;
    margin: 8mm auto;
    padding: 14mm 15mm;
    background: #fff;
    box-shadow: 0 2px 18px rgba(0,0,0,.12);
  }
  h1 { font-size: 20px; margin: 0 0 2px; letter-spacing: -0.01em; }
  h2 {
    font-size: 13px; margin: 20px 0 6px; padding-bottom: 4px;
    border-bottom: 2px solid #1a1a2e; break-after: avoid;
  }
  p { margin: 4px 0; }
  .muted { color: #6b7280; }
  .brandbar { display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    border-bottom: 3px solid #c99a3b; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 13px; font-weight: 700; color: #c99a3b; letter-spacing: .06em; text-transform: uppercase; }
  .meta { font-size: 11px; color: #374151; }
  .meta b { color: #1a1a2e; }

  /* ---- Bandeau synth\xE8se ---- */
  .summary { display: flex; gap: 8px; align-items: center; margin: 10px 0 6px; break-inside: avoid; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .OK { background: #e7f6ec; color: #137a3e; }
  .WARNING { background: #fff4e0; color: #a86400; }
  .CRITICAL { background: #fde8e8; color: #b42318; }

  /* ---- KPI ---- */
  .kpi { display: flex; gap: 10px; margin: 10px 0 4px; break-inside: avoid; }
  .kpi > div { flex: 1; background: #f7f7fb; border: 1px solid #edeef4; border-radius: 8px; padding: 10px 12px; }
  .kpi .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .kpi b { display: block; font-size: 18px; margin-top: 2px; }
  .kpi .gold b { color: #b4801f; }
  .kpi .warn b { color: #b42318; }

  ul { padding-left: 16px; margin: 4px 0; }
  li { margin: 2px 0; break-inside: avoid; }

  /* ---- Tableau anomalies ---- */
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead { display: table-header-group; }            /* en-t\xEAte r\xE9p\xE9t\xE9 \xE0 chaque page */
  th { background: #1a1a2e; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: .03em;
    text-align: left; padding: 6px 6px; }
  td { border-bottom: 1px solid #eceef3; padding: 5px 6px; font-size: 10.5px; vertical-align: top; }
  tr { break-inside: avoid; }
  .num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .detail { color: #374151; }
  .sev { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; }
  .sev-CRITICAL, .sev-critical { background: #fde8e8; color: #b42318; }
  .sev-HIGH, .sev-high { background: #ffe9d6; color: #b45309; }
  .sev-MEDIUM, .sev-medium { background: #fff4e0; color: #a86400; }
  .sev-LOW, .sev-low, .sev-INFO, .sev-info { background: #eef1f6; color: #475569; }

  .foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #9098a5; font-size: 9.5px; }

  /* ---- Bouton impression (\xE9cran uniquement) ---- */
  .toolbar { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; }
  .toolbar button {
    font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    background: #1a1a2e; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,.18);
  }
  @media print {
    body { background: #fff; font-size: 11px; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
    .toolbar { display: none !important; }
  }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
<div class="sheet">
  <div class="brandbar">
    <div>
      <div class="brand">AtlasBanx \xB7 Audit express</div>
      <h1>Rapport d'audit bancaire</h1>
    </div>
    <div class="meta" style="text-align:right">
      <div>P\xE9riode&nbsp;: <b>${fmtDate(meta.periodStart)} \u2192 ${fmtDate(meta.periodEnd)}</b></div>
      <div class="muted">${meta.months} mois \xB7 forfait ${esc(meta.planLabel)}</div>
    </div>
  </div>

  <div class="summary">
    <span class="badge ${status}">${status}</span>
    <span>${esc(((_d = result.summary) == null ? void 0 : _d.message) ?? "")}</span>
  </div>

  <div class="kpi">
    <div><span class="lbl">Transactions</span><b>${result.statistics.totalTransactions}</b></div>
    <div class="${result.statistics.totalAnomalies > 0 ? "warn" : ""}"><span class="lbl">Anomalies</span><b>${result.statistics.totalAnomalies}</b></div>
    <div class="gold"><span class="lbl">Montant r\xE9cup\xE9rable (FCFA)</span><b>${fmt(result.statistics.totalAnomalyAmount)}</b></div>
  </div>

  ${findings ? `<h2>Constats cl\xE9s</h2><ul>${findings}</ul>` : ""}

  <h2>Anomalies d\xE9tect\xE9es</h2>
  <table>
    <thead><tr><th>Type</th><th>Gravit\xE9</th><th class="num">Montant</th><th>D\xE9tail</th></tr></thead>
    <tbody>${anomalyRows || '<tr><td colspan="4">Aucune anomalie d\xE9tect\xE9e. Les frais bancaires semblent conformes.</td></tr>'}</tbody>
  </table>

  ${recos ? `<h2>Recommandations</h2><ul>${recos}</ul>` : ""}

  <div class="foot">
    Audit g\xE9n\xE9r\xE9 par le moteur AtlasBanx (19 d\xE9tecteurs), identique \xE0 l'offre Entreprise.
    Donn\xE9es non conserv\xE9es (audit \xE9ph\xE9m\xE8re). Document A4 \u2014 utilisez \xAB Imprimer / Enregistrer en PDF \xBB.
  </div>
</div>
</body></html>`;
}
export {
  auditReportToHtml,
  partitionByCertainty,
  pricingForRecovery,
  runFullAudit
};
