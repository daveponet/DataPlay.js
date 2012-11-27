//////////////////////////////////////////////////////////////////////////////////////	
//	
//	DataPlay.js
//	
//	Dave Paunesku, Nov 2012
//
//	Functions for sub-selecting and aggregating data with JavaScript.
//	There are three classes:
//		dp			a singleton with various functions used by other classes.
//		dpVector 	a wrapper for 1-D arrays.
//		dpList 		a wrapper for object arrays.
//	
//	Depends jQuery
//	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
//
//////////////////////////////////////////////////////////////////////////////////////	


//	Define dp singleton and some basic functions
var dp = {

	//	These functions return a scalar
	hash:		function( str ){
					var hash = 0, i, cha;
					if (str.length == 0) return hash;
					for (i = 0; i < str.length; i++) {
						cha = str.charCodeAt(i);
						hash = ((hash<<5)-hash)+cha;
						hash = hash & hash; // Convert to 32bit integer
					}
					return hash;
				},

	mean:		function( ar ){
					var i = 0, sum = 0;
					for(i = 0; i < ar.length; i++){
						sum += Number(ar[i]);
					}
					return( Math.round(sum/ar.length * 100)/100 );
				},

	round:		function( value, decimals ){
					if( typeof decimals == "undefined" ){ decimals = 0 }
					var dh = Math.pow(10,decimals);
					value = Math.round( value * dh ) / dh;
					return( value );
				},
				
	//	These functions return an array	
	roundAr:	function( ar, decimals ){
					if( typeof decimals == "undefined" ){ decimals = 0 }
					for( var i=0; i < ar.length; i++ ){
						ar[i] = dp.round( ar[i] )
					}
					return( ar );
				},
	
	unique:		function( ar ){
					var arObj = {};
					var unique = [];
					for( var i=0; i < ar.length; i++){
						arObj[ar[i]] = ar[i];
					}
					for( var attr in arObj ){
						unique.push( arObj[attr] );
					}
					return( unique );
				},

	intersect:	function( ar1, ar2 ){
					var inBoth = ar1.filter(function(n) {
							if(ar2.indexOf(n) == -1)
								return false;
							return true;
						});
					return( dp.unique(inBoth) );
				},

	//	These functions return a dpList
	distribution:function( ar ){
					ar = ar.sort();
					var distribution = [];
					var value = null;
					var count = 0;
					for( var i=0; i < ar.length; i++ ){
						value = ar[i]
						count++;
						if( ar[i+1] != value ){
							distribution.push( { value: value, count: count } )
							count = 0;
						}
					}
					var distribution = new dpList( distribution );
					return( distribution );
				},
				
	//	These functions return an object array, they are used by dpList.where()
	isIn:		function( objAr, attr, haystack ){
					if( ! (haystack instanceof Array) ){ haystack=[ haystack ] }
					var filtered = objAr.filter( function(x){
						var output = jQuery.inArray( x[attr] , haystack ) !== -1;
						return( output );
					} )
					return( filtered );
				},
	isNotIn:		function( objAr, attr, haystack ){
					if( ! (haystack instanceof Array) ){ haystack=[ haystack ] }
					var filtered = objAr.filter( function(x){
						var output = jQuery.inArray( x[attr] , hastack ) == -1;
						return( output );
					} )
					return( filtered );
				},
	contains:	function( objAr, attr, haystack ){
					var filtered = objAr.filter( function(x){
						var output = x[attr].search(haystack) !== -1;
						return( output );
					} )
					return( filtered );
				},
	doesNotContain:function( objAr, attr, haystack ){
					var filtered = objAr.filter( function(x){
						var output = x[attr].search(haystack) == -1;
						return( output );
					} )
					return( filtered );
				}
}


//	dpList DEFINITION
//	dpList DEFINITION
function dpList( data ){
	this.data = data;
}

//	returns dpList matching where clause
//	where specifies object attribute to match on
//	function is the function used for matching attr against value
//	value is the value to be matched on using the operation
dpList.prototype.where = function( attr, func, value ){
	var filtered;
	filtered = func( this.data, attr, value);
	
	//	return a dpList
	var dpl = new dpList( filtered )
	return( dpl );
}

//	returns attr (attribute) as an array
dpList.prototype.get = function( attr ){
	var ar = [];
	for( var i=0; i < this.data.length; i++ ){
		ar.push( this.data[i][attr] )
	}
	var dpVec = new dpVector( ar );
	return( dpVec );
}

//	returns dpList
//	This function subsets by each unique set of idAttrs
//	then performs the specified aggregation function on
//	the value attribute
dpList.prototype.aggregateByGroup = function( idAttrs, func, value ){
	//	idAttrs is assumed to be an array; turn into array if not already
	if( ! (idAttrs instanceof Array) ){ idAttrs=[ idAttrs ] }

	//	the original data are in "melted" or "long" form
	var melted = new dpList(this.data);
	//	they get casted before aggregation
	var casted = [];
		
	//	create a cast-key so it's easier to track rows
	for( var i=0; i < melted.data.length; i++){
		var castKey = "";
		for( var j=0; j < idAttrs.length; j++){
			var attrKey = melted.data[i][ idAttrs[j] ]
			castKey += "delimit" + attrKey
		}
		melted.data[i].castKey = dp.hash(castKey)
	}
	
	//	cycle through all uncasted castKeys
	var uncastedKeys = melted.get('castKey').unique().data
	while( uncastedKeys.length > 0 ){
		// 	remove key from uncasted keys because it will get casted
		var keyToCast = uncastedKeys.shift();
		var targetRows = melted.where('castKey',dp.isIn,keyToCast);
		//	ensure the new row does not have any of the old cols
		//	which were not used for subsetting or aggregated
		var newRow = {}
		for( var i=0; i < idAttrs.length; i++){		
			newRow[ idAttrs[i] ] = targetRows.data[0][ idAttrs[i] ];
		}
		newRow[value] = func( targetRows.get(value).data );
		casted.push( newRow );
	}
	casted = new dpList( casted );
	return( casted );
}

//	dpVector DEFINITION
//	dpVector DEFINITION

//	mean, unique, intersect, round, distribution
function dpVector( data ){
	this.data = data;
}

//	returns mean
dpVector.prototype.mean = function ( ) {
	return( dp.mean( this.data ) )
}

//	returns dpVector with unique values
dpVector.prototype.unique = function ( ) {
	return( new dpVector( dp.unique( this.data ) ) )
}

//	returns the unique intersection of the two arrays
dpVector.prototype.intersect = function( ar ){
	return( new dpVector( dp.intersect( this.data ) ) )
}

//	rounds the object to the specified decimals, default=0
dpVector.prototype.round = function( decimals ){
	return( new dpVector( dp.roundAr( this.data ) ) )
}

//	returns dpList with each unique value and frequency (count)
//	e.g., [ { value:1, count:4 } , { value:2, count:3 } ]
dpVector.prototype.distribution = function( ){
	return( dp.distribution( this.data ) )
}


//
//	UNIT TESTS & USE CASES
//

//	to load data directly from a CSV you can use jquery-csv
//	see http://code.google.com/p/jquery-csv/
	/*	
	*	jQuery.ajax( CSVpath, {success:function(data){
	*			res = jQuery.csv.toObjects(data);
	*			rs = dpList( res );
	*		}
	*	});
	*/	

//	a fake data set
survey = [	{ "id":"user1","time":1, "question":"toi.1", "answer": 2 } ,
			{ "id":"user1","time":1, "question":"toi.2", "answer": 3 },
			{ "id":"user1","time":2, "question":"toi.1", "answer": 2 },
			{ "id":"user1","time":2, "question":"toi.2", "answer": 4 },
			{ "id":"user1","time":2, "question":"se.1", "answer": 4 },
			{ "id":"user2","time":1, "question":"toi.1", "answer": 4 },
			{ "id":"user2","time":1, "question":"toi.2", "answer": 5 },
			{ "id":"user2","time":2, "question":"toi.1", "answer": 5 },
			{ "id":"user2","time":2, "question":"toi.2", "answer": 6 },
			{ "id":"user2","time":2, "question":"se.1", "answer": 5 },
			]

//	turn the survey results into a dpList
s	= new dpList( survey )

//	who were the users?
s.get('id').unique().data
//	returns ['user1','user2']
if( ! (s.get('id') instanceof dpVector) ){ throw "get failed!"; }
if( s.get('id').unique().data.length !== 2 ){ throw "unique failed!"; }

//	how many users were there?
s.get('id').unique().data.length
if( s.get('id').unique().data.length !== 2 ){ throw "get unique failed" }

//	get the theories of intelligence questions with list of question names
ut = s.where('question', dp.isIn ,['toi.1','toi.2']).data
if( ut.length !== 8 ){ throw "where in failed!" }
//	get the theories of intelligence questions by string match (contain "toi.")
ut = s.where('question',dp.contains,'toi.').data
if( ut.length !== 8 ){ throw "where contains failed!" }

//	get the theories of intelligence questions from time 1
ut = s.where('question',dp.contains,'toi.').where('time',dp.isIn,1)
if( ut.data.length !== 4){
	throw "chained where failed!";
}

//	get the mean answer for the time 1 theories of intelligence questions
ut = s.where('question',dp.contains,'toi.').where('time',dp.isIn,1).get('answer').mean()
if( ut !== 3.5 ){ throw "mean failed" }
if( s.where('question',dp.doesNotContain,'toi.').data.length !== 2 ){ 
	throw "does not contain failed!" 
}

//	calculate each user's theories of intelligence at each different time
//	you could do this all on one line, but I break it up for readability
toiQs = s.where('question',dp.contains,'toi.')
toiScore = toiQs.aggregateByGroup( ['id','time'], dp.mean, 'answer' )
if( ! ( toiScore instanceof dpList ) ){ throw "Aggregate by failed!" }

//	now round each individual's score for easier interpretation
ut = toiScore.aggregateByGroup(['id','time'], dp.round, 'answer' )
if(ut.where('id',dp.isIn,['user1']).where('time',dp.isIn,1).data[0].answer != 3){
	throw "rounding failed!"
}

//	what is the mean of individuals' TOI scores across time?
toiScore.get('answer').mean()
if( toiScore.get('answer').mean() != 3.88 ){ throw "Mean of means failed!" }

//	what is the distribution of individuals'
// 	theories of intelligence scores at time 1?
ut = toiScore.where('time',dp.isIn,1).get('answer').distribution()
//	there should be one person with a mean of 2.5
if( ut.where('value',dp.isIn,2.5).get('count').data[0] !== 1 ){
	throw "Distribution failed!";
}

//	clean up after unit tests
delete survey; delete s; delete ut; delete toiQs; delete meanToi;

console.log( "DataPlay.js unit tests complete")



