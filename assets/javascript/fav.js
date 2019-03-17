$(document).ready(function () {
 
 var config = {
     apiKey: "AIzaSyDcivjtLR1cf14Z7z1EiGaIThJ4qwWZKMQ",
     authDomain: "healthapp-fc0e3.firebaseapp.com",
     databaseURL: "https://healthapp-fc0e3.firebaseio.com",
     projectId: "healthapp-fc0e3",
     storageBucket: "",
     messagingSenderId: "153355736177"
 };
 firebase.initializeApp(config);

 var database = firebase.database();



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
 }



 database.ref().on('child_added', function (snap) {
     id = snap.val();
     console.log('hi')
     recipe = new Recipe(id)
     recipe.getRecipe()

         .then(function () {

             //  renderRecipeContent(recipe.name, recipe.images[0].hostedLargeUrl, recipe.totalTime, recipe.numberOfServings, recipe.source.sourceRecipeUrl, recipe.attribution.html);
             //  renderIngredientList(recipe.ingredientLines);
             console.log(recipe);

         })
 })




 var renderRecipeContent = function (name, img, time, servings, source, attr) {

     var imgElem = $('<img>').attr({
         src: img,
         alt: name
     });

     $('#recipe_image').append(imgElem);
     $('#recipe_title').text(name);
     $('#num_servings').text(servings)
     $('#cook_time').text(time);
     $('#directions_btn').attr('href', source);
     $('.recipe_attribution').html(attr);


     $('#shoppingListDiv').append()
 }


});