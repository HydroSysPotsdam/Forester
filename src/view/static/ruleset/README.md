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

Rulesett generates an unstyled form that employs the browsers native input elements. By adding a custom stylesheet and post-processing to add further information, the form can be streamlined to the users requirements.

Rulesett employs an event-based approach. This completely separates the code to generate and maintain the settings form from user-written code. This makes keeping tack of changes in the settings easy and transparent.

JavaScript is a typeless language. This can lead to problems, when methods require optional values from the user. Often this is solved by checking the arguments for missing fields and manually introducing default values. This process is tedious and is error-prone when requirements change half-way through the code and are not updated everywhere. Rulesett tries to solve this problem.

Rulesett is build fully extendable and allows both custom rules (inherited from Validator.js) and input elements.


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

  let form = new SettingsForm(rules, data[, elem])

```

The following HTML is created and can be styled.


#### Keeping Track of Changes

Changes can now be tracked by adding a listener to the DOM:

```js

d3.select(document.body)
  .on("settings-change settings-submit settings-reset", event => console.log(event))

```


## Rules

For each parameter, Rulesett requires a list of rules as a string. Rulesett then generates one input element per parameter based on the first found rule that is registered for an input element.

Each list of rules consists of individual rules separated by vertical bars. Each rule has a unique name, followed by optional values that are passed behind a colon.

Some rules are conditional and only show an effect when other rules are present. These rules do not correspond to input element, but certain features of these input elements like limits or scales.

```js
  let rules = {
    a: "rule1|rule2:optionsForRule2"
  }
```

The rules that are passed to Rulesett can either be nested or flat. Nested parameters are themselves dictionaries containing parameter-rule pairs. Flattened parameters share prefixes that are separated by dots. Both nested parameters and prefixes are treated as groups by Rulesett and are used to organize input elements in the form.

```js
  # nested version
  let rules = {
    group: {
        a: "...",
        b: "..."
    }
  }

  # flattened version
  let rules = {
    "group.a": "...",
    "group.b": "..."
  }
```

**Note**, that both the validation against rules and the generation of a form work exactly the same way, regardless of your choice of format.

### Numerical

The rule `numeric` is used to verify that a parameter has a numeric value. It corresponds with a slider as an input element.

Numerical parameters may be further limited by using the rules `min` and `max`. They directly translate to the limits of the slider.

Values for numerical parameters are given as floating point numbers.

### Categorical

The rule `in` is used to allow a parameter to only take on categorical values. It corresponds with a dropdown as an input element.

The categories are given as rule options, where options are separated by colons. 

Categories are treated as given. They are case-sensitive and are not trimmed.

### Binary

The rule `boolean` is used to allow a parameter to take on a truth value. It corresponds with a checkbox as an input element.

### Default

Default values for parameters may be added using the rule `default`. 

Default values are equally checked against other rules. If a range is specified, the default value needs to fall within this range.

### Adding Custom Rules

Custom input elements can be bound to rules using the static `SettingsForm.register` method. This additionally allows the definition of custom rules, as described in the Validator.js documentation. 

To bind an input element to a `rule`, three functions need to be defined. They correspond to appending the input, retrieving its value and keeping track of changes. 

```js

SettingsForm.register(rule, generatorFn[, valueFn, changeFn])

```

- `rule` 

  The name of the rule which should be used with this generator. For example `numeric`, `in` or `boolean`. 
  
  An input element is added for the first rule that is registered with Rulesett. 

  Reregistering a rule with Rulesett overwrites the default functionality. 


- `generatorFn(options)`

  The generator function is called once per parameter and should add the input element to the form. Generator functions are registered for certain rules, for example `numeric` for sliders, `in` for dropdowns or `boolean` for checkboxes.

  The context is the DOM element to which the function should append the input.  


- `valueFn(value)`

  The value function is called whenever the **parsed** value of an input element should be retrieved or changed. When no argument is given, the function should return the value. Otherwise, the input element should be updated.

  The context is the input element that should be updated.

  The `valueFn` argument is optional, as the following function is used by default:

  ```js
    let valueFn = value => d3.select(this).property("value", value)
  ```

- `changeFn(listener)`  
  
  The change function should add its argument as a change listener to the input element. There is no general way to 
  do this for custom input elements.  
  
  The context is the input element to which the change listener should be added.  
  
  The `changeFn` argument is optional, as the following function is used by default:
  ```js
    let changeFn = listener => d3.select(this).on("change", listener)
  ```

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