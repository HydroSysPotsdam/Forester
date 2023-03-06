<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]


<br />
<div align="center">
  <a href="https://github.com/HydroSysPotsdam/Forester">
    <img src="./src/view/static/img/logo.svg" alt="Logo" width="400" height="auto">
  </a>

  <p align="center">
    <a href="https://hydrosyspotsdam.github.io/Forester/"><strong>Explore the docs »</strong></a>
    <br />
    <a href="https://github.com/HydroSysPotsdam/Forester/issues">Report Bug</a>
    ·
    <a href="https://github.com/HydroSysPotsdam/Forester/issues">Request Feature</a>
  </p>
</div>

## Quickstart

For now, Forester may only be installed by cloning the GitHub repository.

```
git clone https://github.com/HydroSysPotsdam/Forester.git
```

Once the repository is installed, run the following command inside the project folder. Make sure, that you have installed Python.

```
python run.py
```

Now go to the displayed address in your browser. The default value is [http://127.0.0.1:8000](http://127.0.0.1:8000).

We are planning on simplifying the installation dramatically. We want Forester to be installable with Conda and Pip and runnable using a simple script.

## Table of Contents
<ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact-us">Contact Us</a></li>
</ol>

---

## About The Project

Forester is an interactive web-based visualization tool for decision trees. With Forester, decision trees finally become beautiful __and__ informative!

With our modular approach, one decision tree can take on many forms. Of course, any one looks good by itself!
This allows the user to exactly convey what is important.

Below you can see a classification for the infamous Fisher Iris dataset. 
We think Foresters illustration far outperforms R or Matlab.

<br>

![](docsource/html/_images/preview.png)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

Learn more about Forester by reading the section [Getting Started]() in the docs. Or you just try it out yourself!

## Roadmap

We are planning to publish Forester in three development steps.

Forester is usable in any of these steps, allowing user to test it and contribute to its functionality.

### Basic Functionality (2023/Q1):
The first development iteration focuses mainly on the visualization of already calculated decision trees. 
From user generated _classification_ decision trees in R, Matlab or Python, Forester will generate publication ready plots.
The following features are planned:
- [x] Support for R's _rpart_ and Matlab's _fitctree_
- [x] Different Visualization approaches
  - [x] Text summary
  - [x] Class distribution charts
  - [x] Focussed on features and splitting values
- [x] Customizable legend
- [x] Sample flow indicator
- [ ] Custom layout algorithm
- [ ] Support for Python classification libraries
- [ ] Interactive Tutorial
- [ ] Customizing visualization for every node
- [ ] Export as svg, png, pdf

<br>

![](docsource/html/_images/upcoming_v0.png)


### Data-Driven Visualization (2023/Q4)
The second introduces a data-driven approach, allowing access to the original training data and much more insightful visualizations.

- [ ] Support for regression trees
- [ ] Advanced node visualizations
  - [ ] Class distribution based on feature values
  - [ ] Regression value based on feature values
  - [ ] Feature space illustrations
  - [ ] Partial dependence plots
  
<br>
  
![](docsource/html/_images/upcoming_v1.png)

### A Human in the Loop

The third one focuses on the human-in-the-loop approach by allowing the user to influence the training algorithm by interacting with the illustration.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License
Distributed under the [CC-BY-NC][license-url] license.

## Contact Us

Send a mail to 💌 [David Strahl](<mailto:david.strahl@uni-potsdam.de>) or 💌 [Robert Reinecke](<mailto:robert.reinecke@uni-potsdam.de>).

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/HydroSysPotsdam/Forester.svg?style=for-the-badge
[contributors-url]: https://github.com/HydroSysPotsdam/Forester/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/HydroSysPotsdam/Forester.svg?style=for-the-badge
[forks-url]: https://github.com/HydroSysPotsdam/Forester/network/members
[stars-shield]: https://img.shields.io/github/stars/HydroSysPotsdam/Forester.svg?style=for-the-badge
[stars-url]: https://github.com/HydroSysPotsdam/Forester/stargazers
[issues-shield]: https://img.shields.io/github/issues/HydroSysPotsdam/Forester.svg?style=for-the-badge
[issues-url]: https://github.com/HydroSysPotsdam/Forester/issues
[license-shield]: https://img.shields.io/badge/License-CC_BY--NC_4.0-lightgrey.svg?style=for-the-badge
[license-url]: https://creativecommons.org/licenses/by-nc/4.0/
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Angular.io]: https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white
[Angular-url]: https://angular.io/
[Svelte.dev]: https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00
[Svelte-url]: https://svelte.dev/
[Laravel.com]: https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white
[Laravel-url]: https://laravel.com
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[JQuery.com]: https://img.shields.io/badge/jQuery-0769AD?style=for-the-badge&logo=jquery&logoColor=white
[JQuery-url]: https://jquery.com 