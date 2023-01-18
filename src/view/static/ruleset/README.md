# Ruleset

Ruleset is a small library that validates data and can be used to generate and organise settings from custom rules.
It is based on Mike Erickson's [Validator.js](https://github.com/mikeerickson/validatorjs). It is part of
the [Forester](https://github.com/HydroSysPotsdam/Forester) project and still under development.

- credit to Mike Erickson
- why validate against rules?

## Why Ruleset?

- easy validation of settings using validator.js
- out-of-the-bag support for default values
- form can easily be styled with css
- form can easily be extended using any DOM manipulation library (d3, jquery, ...)
- event based approach

JavaScript is a typeless language. This can lead to problems, when methods require optional values from the user. Often this is solved by checking the arguments for missing fields and manually introducing default values. This process is tedious and is error-prone when requirements change half-way through the code and are not updated everywhere. Rulesett tries to solve this problem.


## Quickstart

To generate a form you need to define two objects. The rules from which _Rulesett_ generates the settings and the initial values. Fortunately, the initial value can even be empty, when you define default values in the rules.

Assume you want the user to change two numeric variables with custom limits and initial values. Your rules could then look as follows:

```js 

let rules = {
  "a": "numeric|min:0|max:100|default: 50",
  "b": "numeric|min:0|max:200|default:100"
}

``` 

Rulesett will now work with two numeric parameters, called `a` and `b`, that take values from `0` to `100` and `0` to `200`. 

#### Validation Against the Rules

You can now validate another object against these rules using the `Validator` class. 

```js
  let validator = new Validator(rules, {a: 20, b:50})
  validator.passes() // true

  let validator = new Validator(rules, {b:50})
  validator.passes() // true

  let validator = new Validator(rules, {b:300})
  validator.passes() // false
```

In the first two cases, the validation is successfull, as the values are within the specified ranges and the rules provide default values. 

In the third case the validation fails, as the value for `b` is outside the specified range.

#### Creating the Settings Form

Creating a settings form is equally easy and requires only one line of code. Without any passed DOM element, the form is added to the documents body.

```js

  let data = {a: 50, b:0}

  let form = new SettingsForms(rules, data[, elem])

```

The following HTML is created and can be styled.


<center>
  <div>
    <form class="settings-form">
        <div class="settings-entry" for="a">
            <label for="a" class="settings-entry-label">a</label>
            <input type="range" min="0" max="100" step="1" value="50" id="a" class="settings-input" rule="numeric">
        </div><div class="settings-entry" for="b">
            <label for="b" class="settings-entry-label">b</label>
            <input type="range" min="0" max="200" step="2" value="0" id="b" class="settings-input" rule="numeric">
        </div><button class="settings-submit">Submit</button>
    </form>
  </div>
</center>


#### Keeping Track of Changes



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

Rulesett uses an event-based approach to cummunicate changes in the settings. Events are dispatched in three cases: (1) when the value of one parameter is changed and (2) when settings are submitted or (3) reset. Events are dispatched within the DOM event system and listeners can therefore be added using standard DOM manipulation libraries.

Each event holds information on the curent settings. The field `values` holds the settings that are currently displayed in the form. The rules that have been used to generate the form are stored in `rules`. The names of all parameters that changed with the event are stored as an array in the field `changed`. Changed parameters are always relative to the initial values or latest submitted values if they exist. 

1. `"settings-change"`  
   Dipatched whenever the value of an input element is changed. The list of changed parameters is relative to the inital values or latest submitted values. The event is dispatched on the input element that triggered the change and bubbles.

2. `"settings-submit"`  
   Dispatched whenever the user clicks the submit button. This updates the initial values to which the form would be reset. The list of changed parameters is again relative to the initial values or previous submit. The event is dispatched from the form and bubbles.

3. `"settings-reset"`  
   Dispatched when the `reset()` function is called on the form. This reverts the values to the inital or latest submitted ones. The changed parameters are those that need to be changed. The event is dispatched from the form and bubbles.  

  **NOTE:** Resetting does currently not update the input elements. Therefore resetting should always coincide with closing the form, as the input elements are regenerated when it is opened again.

## License

Rulsett is distributed under the CC BY-NC 4.0 license. 

Mike Erickson's [Validator.js](https://github.com/mikeerickson/validatorjs) is distributed under the MIT license which is more liberal.