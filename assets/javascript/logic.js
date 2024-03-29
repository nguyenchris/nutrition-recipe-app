$(document).ready(function () {

    /***************************** Global Variables / Initializations *************************/

    // Initialize database
    // Firebase
    var config = {
        apiKey: "AIzaSyDcivjtLR1cf14Z7z1EiGaIThJ4qwWZKMQ",
        authDomain: "healthapp-fc0e3.firebaseapp.com",
        databaseURL: "https://healthapp-fc0e3.firebaseio.com",
        projectId: "healthapp-fc0e3",
        storageBucket: "",
        messagingSenderId: "153355736177"
    };
    firebase.initializeApp(config);



    // Initialize filter tabs
    var filterTabs = document.querySelector('.tabs');
    var instance = M.Tabs.init(filterTabs, {
        onShow: function () {
            // var id = $(this)[0].$content.attr('id')
            // $('#' + id).addClass('slideUptab');
        }
    });



    // Initialize side navbar
    $('.sidenav').sidenav();


    // Global Variables
    var search = {};
    var recipe = {};
    var key = '6c1aa41e76cc55600f7a88e531724d23'; // Chris's Yummly API key
    var appID = '992846dd' // Chris's Yummly API ID
    var searchURL = 'https://api.yummly.com/v1/api/recipes?_app_id=992846dd&_app_key=6c1aa41e76cc55600f7a88e531724d23';
    var recipeURL = 'https://api.yummly.com/v1/api/recipe/';
    var searchQuery = '';
    var newQuery = '';
    var newIncIngredient = '';
    var newExIngredient = '';
    var currentPage;
    var page = 10;
    var ajaxRunning = false;
    var recipeNutrLabel = {};
    var labelTemplate = {
        valueServingUnitQuantity: 2,
        showAmountPerServing: false,
        showIngredients: false,
        showServingUnitQuantity: true,
        widthCustom: 'auto',
        allowFDARounding: true,
        decimalPlacesForNutrition: 2,
        brand_name: null,
        showPolyFat: false,
        showMonoFat: false,
        showTransFat: false,
        showAddedSugars: false,
        showLegacyVersion: false,
    }






    /********************************** Classes / Dynamic Data ******************************/

    /***
     * Classes will construct a new object for every search
     * Less API calls for data and easier saved locally in order for DRY code
     */
    class Search {
        constructor(query) {
            this.query = query;
        }

        // Method to get new search results
        getResult() {

            // returns the GET request
            return $.get(`${searchURL}${this.query}&maxResult=9&requirePictures=true`, function (response) {

                var arr = response.matches;

                // Search API request does not contain larger images
                // Loop array of recipes
                for (var i = 0; i < arr.length; i++) {
                    var largeImg = null;
                    var img;

                    // change to large image URL
                    if (arr[i].hasOwnProperty('smallImageUrls')) {
                        largeImg = arr[i].smallImageUrls[0].replace('=s90', '=l90');
                        arr[i].smallImageUrls[0] = largeImg;
                    } else if (arr[i].hasOwnProperty('imageUrlsBySize')) {
                        img = arr[i].imageUrlsBySize['90'];
                        largeImg = img.replace('=s90', '=l90');
                        arr[i].imageUrlsBySize['90'] = largeImg;
                    }
                }

                // Contains object of attributions Yummly requires
                this.attribution = response.attribution;

                // Contains number of total matches a user searches for
                this.totalMatchCount = response.totalMatchCount;

                // Contains object of all the facetCounts matching the results of faceField parameter
                this.facetCounts = response.facetCounts;

                // Contains object of all the filters/criteria that a user may select for a search
                this.criteria = response.criteria;

                // Assign results property as array of recipes
                this.results = arr;

            }.bind(this));
        }
    };



    // Class to create an object containing a certain recipe
    class Recipe {
        constructor(id) {
            this.id = id;
        }

        // Method to get the Recipe API request
        getRecipe() {

            return $.get(`${recipeURL}${this.id}?_app_id=${appID}&_app_key=${key}`, function (response) {

                this.attribution = response.attribution;
                this.nutritionEstimates = response.nutritionEstimates;
                this.totalTime = response.totalTime;
                this.images = response.images;
                this.name = response.name;
                this.yield = response.yield;
                this.source = response.source;
                this.ingredientLines = response.ingredientLines;
                this.numberOfServings = response.numberOfServings;
                this.totalTimeInSeconds = response.totalTimeInSeconds;
                this.attributes = response.attributes;
                this.flavors = response.flavors;
                this.rating = response.rating;

            }.bind(this));
        };

        // Method will get all nutrition facts for the recipe 
        // As well as for each individual ingredient
        getNutrition() {

            // Loop and remove characters that may cause incorrect query response
            for (var i = 0; i < this.ingredientLines.length; i++) {
                var str = this.ingredientLines[i];

                if (str.includes('(')) {
                    var paren1 = str.replace(/[(]/g, '');
                    str = paren1;
                }
                if (str.includes(')')) {
                    var paren2 = str.replace(/[)]/g, '');
                    str = paren2;
                }
                if (str.includes(',')) {
                    var comma = str.replace(/[,]/g, '');
                    str = comma;
                }
                if (str.includes('[')) {
                    var bracket = str.replace(/[[]]/g, '');
                    str = bracket;
                }

                this.ingredientLines[i] = str;
            }

            var ingredientsQuery = this.ingredientLines.join(', ');

            // Return Ajax POST request with string of different ingredients
            return $.ajax({
                    url: 'https://trackapi.nutritionix.com/v2/natural/nutrients',
                    method: 'POST',
                    data: JSON.stringify({
                        "query": ingredientsQuery
                    }),
                    headers: {
                        'x-app-id': '5c7c2452',
                        'x-app-key': '3be9c3d24ea69fa0514bc303edc7171b',
                        'x-remote-user-id': '0'
                    },
                    contentType: 'application/json',
                    cache: false,
                    dataType: 'json'
                })
                .then(function (response) {
                    var ingredient = response.foods;
                    var allIngNutritionArr = [];
                    var calciumRecipe = 0;
                    var vD = 0;
                    var ironRecipe = 0;

                    console.log(ingredient);

                    // Calculate each nutrient from each ingredient object that is within an array
                    var calories = ingredient.reduce((acc, ing) => acc + ing.nf_calories, 0);

                    var cholesterol = ingredient.reduce((acc, ing) => acc + ing.nf_cholesterol, 0);

                    var fiber = ingredient.reduce((acc, ing) => acc + ing.nf_dietary_fiber, 0);

                    var potassium = ingredient.reduce((acc, ing) => acc + ing.nf_potassium, 0);

                    var protein = ingredient.reduce((acc, ing) => acc + ing.nf_protein, 0);

                    var satFat = ingredient.reduce((acc, ing) => acc + ing.nf_saturated_fat, 0);

                    var sodium = ingredient.reduce((acc, ing) => acc + ing.nf_sodium, 0);

                    var sugar = ingredient.reduce((acc, ing) => acc + ing.nf_sugars, 0);

                    var carb = ingredient.reduce((acc, ing) => acc + ing.nf_total_carbohydrate, 0);

                    var fat = ingredient.reduce((acc, ing) => acc + ing.nf_total_fat, 0);


                    // Begin loop for each ingredient
                    for (var i = 0; i < ingredient.length; i++) {

                        // Make each object key/value pairs into an array
                        var preArray = Object.entries(ingredient[i]);
                        var filterArray = [];

                        // Reassign key names from the response in order for jQuery 
                        // NF Label Plug-in to display properly
                        preArray[0][0] = 'itemName';
                        preArray[5][0] = 'valueCalories';
                        preArray[6][0] = 'valueTotalFat';
                        preArray[7][0] = 'valueSatFat';
                        preArray[8][0] = 'valueCholesterol';
                        preArray[9][0] = 'valueSodium';
                        preArray[10][0] = 'valueTotalCarb';
                        preArray[11][0] = 'valueFibers';
                        preArray[12][0] = 'valueSugars';
                        preArray[13][0] = 'valueProteins';
                        preArray[14][0] = 'valuePotassium_2018';
                        preArray[15][0] = 'valuePhosphorus';


                        // Loop first 17 nutrients/data
                        for (var j = 0; j < 17; j++) {

                            if (j === 16) {

                                var calcium = ['valueCalcium'];
                                var vitaminD = ['valueVitaminD'];
                                var iron = ['valueIron'];

                                if (preArray[j][1][12] !== undefined) {
                                    calcium[1] = preArray[j][1][12].value;
                                    filterArray.push(calcium);
                                    calciumRecipe += calcium[1];
                                }

                                if (preArray[j][1][24] !== undefined) {
                                    vitaminD[1] = preArray[j][1][24].value;
                                    filterArray.push(vitaminD);
                                    vD += vitaminD[1];
                                }

                                if (preArray[j][1][20] !== undefined) {
                                    iron[1] = preArray[j][1][20].value;
                                    filterArray.push(iron);
                                    ironRecipe += iron[1];
                                }
                            }

                            if (j > 4) {
                                preArray[j][1];
                            }

                            filterArray.push(preArray[j]);
                        }

                        // Make the array of key/value arrays back to an object
                        var obj = Object.assign(...filterArray.map(ing => ({
                            [ing[0]]: ing[1]
                        })));

                        obj.img = preArray[31][1]['thumb'];
                        allIngNutritionArr.push(obj);
                    }

                    // Assign all recipe nutrient data to recipe object
                    this.recipeNutritionLabel = {
                        itemName: this.name,
                        valueServingUnitQuantity: this.numberOfServings,
                        valueServingSizeUnit: this.numberOfServings,
                        valueCalories: calories,
                        valueTotalFat: fat,
                        valueSatFat: satFat,
                        valueCholesterol: cholesterol,
                        valueSodium: sodium,
                        valueTotalCarb: carb,
                        valueFibers: fiber,
                        valueSugars: sugar,
                        valueProteins: protein,
                        valuePotassium_2018: potassium,
                        valueCalcium: calciumRecipe,
                        valueVitaminD: vD,
                        valueIron: ironRecipe
                    }

                    this.allIngNutritionArr = allIngNutritionArr;

                }.bind(this))
        }
    };








    /******************************* Global APP Controllers *****************************/

    // Controls all searching tasks
    const searchController = function (query, bool) {

        // 1) Assign new search object
        search = new Search(query);

        if (!bool) {
            $('#recipes_view').empty();
            $('.num_results').empty();
        }
        // 2) Prepare UI for recipes

        // Render the preloader
        renderLoader(true);

        // 3) Call getResult method to return API response consisting of recipes
        search.getResult(query)

            // If API request successful
            .then(function () {
                console.log(search);
                console.log(search.results);

                // 4) Render results to UI
                renderLoader(false);
                renderTotalMatches(search.totalMatchCount);
                renderResults(search.results);

            })

            // If API returns error
            .fail(function (error) {
                displayNoResults();
            });
    };


    // Controls all recipe tasks
    const recipeController = function (id) {

        if (id) {

            // Create new Recipe object
            recipe = new Recipe(id);

            // Call getRecipe method to call API request
            recipe.getRecipe()

                .then(function () {
                    // After recipe object returns, get nutrition facts for recipe and ingredients
                    console.log(recipe);
                    recipe.getNutrition()

                        .then(function () {
                            // Combine the nutrition label template with the recipe nutrition data
                            recipeNutrLabel = Object.assign({}, labelTemplate, recipe.recipeNutritionLabel);

                            console.log(recipeNutrLabel);

                            // Render recipe content
                            renderRecipeContent(recipe.name, recipe.images[0].hostedLargeUrl, recipe.totalTime, recipe.numberOfServings, recipe.source.sourceRecipeUrl, recipe.attribution.html);

                            // Render ingredient list
                            renderIngredientList(recipe.ingredientLines);

                            // Render nutrition label
                            renderNutrLabel(recipeNutrLabel);

                            renderIngredientDetails(recipe.allIngNutritionArr);
                            console.log(recipe.allIngNutritionArr);

                        })

                        .then(function () {
                            // After all recipe items are rendered to modal, open the modal
                            renderRecipeModal();
                        })
                })

                // If search fails
                .fail(function (error) {
                    displayNoResults();
                })
        }
    };


    // Controls all search filter selections / removals
    const filterController = function (type, param, status) {
        var filter = param + type;

        // Reassign page variable to 10 in order to reset page start parameter
        page = 10;

        // If page start parameter is present in query, remove it
        if (searchQuery.indexOf('&start=') !== -1) {
            searchQuery = searchQuery.replace('&start=' + currentPage, '');
        }

        // If this search is a query parameter search..
        if (param === '&q=' && newQuery.length > 0) {
            searchQuery = searchQuery.replace(newQuery, filter);
            newQuery = filter;
        } else if (param === '&q=') {
            newQuery = filter;
            searchQuery += filter;
        } else {

            // If this filter is a newly added filter
            if (status) {
                // Combine with current search query
                searchQuery += filter;

                // If user removes filter
            } else if (!status) {
                // Remove filter from search query
                searchQuery = searchQuery.replace(filter, '');
            }
        }
        // Begin new search
        searchController(searchQuery);
    };

    // Closure in order to increment page number by multiples of 10
    // Resets to page 1 if a new search occurs
    var incrementPage = (function (n) {
        return function () {
            if (page === 10) {
                n = 10;
            }
            n += 10;
            return n;
        }
    }(10));







    /********************************** UI / View Functions ******************************/

    // Renders results and appends to recipes class in DOM
    var renderResults = function (recipes) {

        if (search.totalMatchCount === 0) {
            displayNoResults();
        } else {
            recipes.forEach(function (el) {
                var img, sourceText
                totalStars = []
                var card = $('<div class="fadeInSearch recipe_card">');
                var contentDiv = $('<div class="recipe_card_content">');
                var source = $('<p class="recipe_card_source">');
                var ratingP = $('<p class="recipe_card_rating">');

                var imgDiv = $('<div class="recipe_card_img recipe_result" data-recipeid="' + el.id + '">');
                var name = $('<h4 class="recipe_card_name recipe_result" data-recipeid="' + el.id + '">' + limitRecipeTitle(el.recipeName) + '</div>"');

                if (el.hasOwnProperty('smallImageUrls')) {
                    img = $('<img>').attr('src', el.smallImageUrls[0]);
                } else if (el.hasOwnProperty('imageUrlsBySize')) {
                    img = $('<img>').attr('src', el.imageUrlsBySize['90']);
                }

                imgDiv.append(img);
                card.append(imgDiv);

                if (el.hasOwnProperty('rating')) {

                    for (var i = 0; i < el.rating + 1; i++) {
                        totalStars.push('<i class="material-icons">star</i>');
                    }
                }

                sourceText = el.sourceDisplayName.toUpperCase();
                source.append(sourceText);
                contentDiv.append(name).append(source).append(ratingP);
                card.append(contentDiv);
                ratingP.html(totalStars.join(''));
                $('#recipes_view').append(card);
            });
        }

        // Assign ajaxRunning to false after recipes render in order to 
        // continue displaying more recipes once user scrolls to bottom
        ajaxRunning = false;
    };


    // Renders total amount of matches depending on search
    var renderTotalMatches = function (total) {
        $('.num_results').empty();
        el = $("<p>Total Suggested Recipes: " + total + "</p>");
        $('.num_results').append(el);
    };

    // Renders the recipe content, not including ingredient list
    var renderRecipeContent = function (name, img, time, servings, source, attr) {
        var imgElem = $('<img>').attr({
            src: img,
            alt: name
        });

        $('#recipe_image').append(imgElem);
        $('#recipe_title').text(name);
        $('#num_servings').text(servings);
        $('#cook_time').text(time);
        $('#directions_btn').attr('href', source);
        $('.recipe_attribution').html(attr);
    };

    // Renders the modal to open, also removes all the different items in HTML after being closed
    var renderRecipeModal = function () {
        var modal = document.querySelector('#recipe_modal');
        var instance = M.Modal.init(modal, {
            onCloseEnd: function () {
                $('#recipe_title').empty();
                $('#recipe_image').empty();
                $('#cook_time').empty();
                $('#num_servings').empty();
                $('#recipe_attribution').empty();
                $('#ing_list').empty();
                $('#ing_details').empty();
            },
            dismissible: true,
        });
        instance.open();
    };

    // Renders unordered list of ingredients to modal
    var renderIngredientList = function (list) {
        var tmpList = '';
        for (i = 0; i < list.length; i++) {

            li = '<li>' + list[i] + '</li>';
            tmpList += li;
        }
        $('#ing_list').append(tmpList);
    };

    var renderIngredientDetails = function (arr) {
        for (i = 0; i < arr.length; i++) {

            ingImg = `<td><img src="${arr[i].img}" alt="${arr[i].itemName}"></td>`
            ingQty = `<td>${arr[i].serving_qty}</td>`
            ingUnit = `<td>${arr[i].serving_unit}</td>`
            ingName = `<td>${arr[i].itemName}</td>`
            ingCal = `<td>${arr[i].valueCalories}</td>`
            ingWeight = `<td>${arr[i].serving_weight_grams} g</td>`

            ingRow = `<tr class="ing_details_row" data-ingdetails="${i}">${ingImg}${ingQty}${ingUnit}${ingName}${ingCal}${ingWeight}</tr>`
            $('#ing_details').append(ingRow);
        }
    };

    // Renders nutrition label to modal
    var renderNutrLabel = function (obj) {
        $('#recipe_nutr_label').empty();
        $('#recipe_nutr_label').nutritionLabel(obj);
    }



    // Prevents white space in URL
    var encodeSearch = function (param, query) {
        var enQuery = encodeURIComponent(query);

        if (param == '&allowedIngredient%5B%5D=' || param == '&excludedIngredient%5B%5D=') {
            filterController(enQuery, param, true);
        } else if (param == '&q=') {
            filterController(enQuery, param);
        }
    };

    // Renders preloader gif
    var renderLoader = function (e) {
        var loaderDiv = $("<div class='preloader_content'>");
        var loader = $("<img class='preloader'>").attr('src', 'assets/images/preloader.gif');
        loaderDiv.append(loader);

        if (e) {
            $('#recipes_view').append(loaderDiv);
        } else {
            setTimeout(function () {
                $('.preloader_content').remove();
            }, 200);
        }
    };

    // Displays on UI that no recipe results were found
    var displayNoResults = function () {
        var tag = $('<h4>');
        tag.text('Sorry, no recipes found.');

        $('.num_results').append(tag);

        $('.preloader_content').remove();
    };

    // Displays ingredient filter tag inside ingredients filter
    var displayIngredientFilter = function (type, ingredient, param) {
        var enIngredient = encodeURIComponent(ingredient);
        var html = `<div class="ingredient_tag ingredient_${type}_del" data-ingredient="${enIngredient}" data-ingparam="${param}">${ingredient}<i class="close material-icons ingredient_del">close</i>`
        var selector = `.ingredient_${type}_col`;

        $(selector).append(html);
    };


    // Limits length of the name of the recipe to prevent the name extending 
    // to a second line on HTML during recipe search
    const limitRecipeTitle = (title) => {
        var limit = 24
        const newTitle = [];
        if (title.length > limit) {
            title.split(' ').reduce((acc, cur) => {
                if (acc + cur.length <= limit) {
                    newTitle.push(cur);
                }
                return acc + cur.length;
            }, 0);

            // return the result
            return `${newTitle.join(' ')} ...`;
        }
        return title;
    }





    /************************************ Event Listeners ********************************/

    // Search submit button listener
    $('.submit').on('click', function (e) {
        e.preventDefault();
        var query = $('#textarea1').val().trim();

        if (query.length > 1) {
            encodeSearch('&q=', query);
        }

        $('#textarea1').val('');
    });


    // Click Listener for when a user clicks a recipe image to display recipe details
    $(document).on('click', '.recipe_result', function () {
        var id = $(this).attr('data-recipeid');
        recipeController(id);
    });

    // Click listener to display an ingredient's nutrition facts
    $(document).on('click', '.ing_details_row', function () {
        var i = $(this).attr('data-ingdetails');
        var recipeNutrLabelIng = Object.assign({}, labelTemplate, recipe.allIngNutritionArr[i]);
        recipeNutrLabelIng.valueServingUnitQuantity = recipe.allIngNutritionArr[i].serving_qty;
        recipeNutrLabelIng.valueServingSizeUnit = recipe.allIngNutritionArr[i].serving_qty;
        recipeNutrLabelIng.originalServingUnitQuantity = 0
        recipeNutrLabelIng.nutritionValueMultiplier = 1
        renderNutrLabel(recipeNutrLabelIng);

    });

    // Search Keypress Listener
    $('#search_form').keypress((e) => {
        var query = $('#textarea1').val().trim();
        if (e.keyCode === 13 || e.which === 13) {
            e.preventDefault();
            if (query.length > 1) {
                encodeSearch('&q=', query);
                $('#textarea1').val('');
            }
        }
    });


    // Search field listener for when a user clicks on search field or not, slides filters down
    $("#textarea1").on({
        focus: function () {
            $('#filters').slideDown('435');
        },
        blur: function () {
            hideOnClickOutside('#filters');
        }
    });

    // Function adds/removes click listener depending on if user clicks inside or outside filter area
    var hideOnClickOutside = function (selector) {
        const outsideClickListener = (event) => {
            if (!$(event.target).closest(selector).length) {
                if ($(selector).is(':visible') || $(event.target).has('#actualSearchBar')) {
                    if ($(event.target).hasClass('ingredient_del')) {
                        event.stopPropagation();
                    } else {
                        $(selector).slideUp('435');
                        removeClickListener();
                    }
                }
            }
        };
        const removeClickListener = () => {
            document.removeEventListener('click', outsideClickListener);
        };
        document.addEventListener('click', outsideClickListener);
    };


    // Check box listener to determine if a certain checkbox is selected or not
    $('input[type=checkbox]').on('change', function () {
        var input = $(this);
        var filterType = input.attr('data-filter');
        var param = input.attr('data-param');

        if (input.is(':checked')) {
            filterController(filterType, param, true);
        } else {
            filterController(filterType, param, false);
        }
    });


    // // Keypress listener for included ingredients search field
    $('.ingredient_inc_form').keypress((e) => {
        var ingredient = $('.ingredient_inc_field').val().trim();
        if (e.keyCode === 13 || e.which === 13) {
            e.preventDefault();
            if (ingredient.length > 1) {
                newIncIngredient = ingredient.toLowerCase();
                encodeSearch('&allowedIngredient%5B%5D=', newIncIngredient);
                displayIngredientFilter('inc', newIncIngredient, '&allowedIngredient%5B%5D=');
                $('.ingredient_inc_field').val('');
            }
        }
    });


    // Keypress listener for excluded ingredients search field
    $('.ingredient_ex_form').keypress((e) => {
        var ingredient = $('.ingredient_ex_field').val().trim();
        if (e.keyCode === 13 || e.which === 13) {
            e.preventDefault();
            if (ingredient.length > 1) {
                newExIngredient = ingredient.toLowerCase();
                encodeSearch('&excludedIngredient%5B%5D=', newExIngredient);
                displayIngredientFilter('ex', newExIngredient, '&excludedIngredient%5B%5D=');
                $('.ingredient_ex_field').val('');
            }
        }
    });


    // Click listener for when user removes a filtered ingredient
    $(document).on('click', '.ingredient_del', function (e) {
        var parentEl = $(this).parent();
        var ingredient = parentEl.attr('data-ingredient');
        var param = parentEl.attr('data-ingparam');
        filterController(ingredient, param, false);
        parentEl.remove();
    });


    // Scroll listener to detect when user scrolls to the bottom of the page
    $(window).scroll(function () {

        if ($(window).scrollTop() == $(document).height() - $(window).height()) {
            if (searchQuery.length > 0) {
                if (searchQuery.indexOf('&start=') !== -1) {
                    searchQuery = searchQuery.replace('&start=' + currentPage, '');
                }
                if (!ajaxRunning) {
                    ajaxRunning = true;
                    currentPage = incrementPage();
                    page = currentPage;
                    queryPage = `${searchQuery}&start=${currentPage}`;
                    searchController(queryPage, true);
                }
            }
        }
    });



});

// BECKY - COMMENT/UNCOMMENT THESE LINES FOR MODAL TESTING
// Lines 379-381, 396-398, 402
// Every recipe content will update except for the ingredient table for now