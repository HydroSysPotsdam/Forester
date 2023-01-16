# Ruleset

Ruleset is a small library that validates data and can be used to generate and organise settings from custom rules.
It is based on Mike Erickson's [Validator.js](https://github.com/mikeerickson/validatorjs). It is part of
the [Forester](https://github.com/HydroSysPotsdam/Forester) project and still under development.

- credit to Mike Erickson
- why validate against rules?
- 

## Why Ruleset?

- easy validation of settings using validator.js
- out-of-the-bag support for default values
- form can easily be styled with css
- form can easily be extended using any DOM manipulation library (d3, jquery, ...)
- event based approach

## Quickstart

- hands-on explanation of syntax
- event handling

## Rules

- Each entry in the object is counted as a parameter-rule pair. For each entry Rulesett generates one input element 
  in the form.
- Parameters can be nested or names can contain string, yielding groupings in the form.
- Rules always have a unique name. Optional values can be passed behind a colon. The rule is treated as a flag if no 
  optional values are passed.
- Rules can be combined using a vertical bars.
- Additional rules for further input elements may be registered with Rulesett.


### Numerical

### Categorical

### Binary

### Adding Custom Rules

## Events

### `settings-change`

### `settings-submit`

### `settings-reset`

## License