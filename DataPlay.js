//////////////////////////////////////////////////////////////////////////////////////	
//	
//	DataPlay.js
//	
//	Dave Paunesku, Nov 2012
//
//	Functions for sub-selecting and aggregating data with JavaScript.
//	There are three classes:
//		DataPlay	a singleton with functions used by dpVector and DataSet.
//		dpVector 	a wrapper for 1-D arrays.
//		DataSet 	a wrapper for object arrays.
//	
//	Depends jQuery
//	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js"></script>
//
//////////////////////////////////////////////////////////////////////////////////////	

//	Define DataPlay singleton and some basic functions
var DataPlay = {

	//	These functions return a scalar
	hash:		function( str ){
					var hash = 0, i, char;
					if (str.length == 0) return hash;
					for (i = 0; i < str.length; i++) {
						char = str.charCodeAt(i);
						hash = ((hash<<5)-hash)+char;
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

	//	These functions return an array or scalar		
	round:		function( ar, decimals ){
					//	two modes so you same function can return array or scalar
					mode = (ar instanceof Array) ? "array" : "scalar";
					var prerounded = ar;
					var rounded = [];
					if( mode == "scalar" ){ var prerounded=[ prerounded ] }
					if( typeof decimals == "undefined" ){ decimals = 0 }
					for( i=0; i < prerounded.length; i++ ){
						dh = Math.pow(10,decimals)
						rounded[i] = Math.round( prerounded[i] * dh ) / dh;
					}
					if( mode == "scalar" ){ rounded = rounded.shift() }
					return( rounded );
				},
				
	//	These functions return an array	
	unique:		function( ar ){
					return( ar.sort().filter(
						function(el,i,a){
							if(i==a.indexOf(el)) return 1; return 0;
						}));
				},

	intersect:	function( ar1, ar2 ){
					inBoth = ar1.filter(function(n) {
							if(ar2.indexOf(n) == -1)
								return false;
							return true;
						});
					return( DataPlay.unique(inBoth) );
				},

	//	These functions return a DataSet
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
					distribution = new DataSet( distribution );
					return( distribution );
	}
}


//	DATASET DEFINITION
//	DATASET DEFINITION
function DataSet( data ){
	this.data = data;
}

//	returns DataSet matching where clause
//	where specifies object attribute to match on
//	operation (op) accepts: "in" and "not in" if value is arrays or scalars
//							"contains" and "does not contain" as strings
//	value is the value to be matched on using the operation
DataSet.prototype.where = function( attr, op, value ){
	var filtered;
	if( op == "in" ){
		// turn non-arrays into arrays
		if( ! (value instanceof Array) ){ value=[ value ] }
		filtered = this.data.filter( function(x){
			var output = $.inArray( x[attr] , value ) !== -1;
			return( output );
		} )
	}
	else if( op == "not in" ){
		// turn non-arrays into arrays
		if( ! (value instanceof Array) ){ value=[ value ] }
		filtered = this.data.filter( function(x){
			var output = $.inArray( x[attr] , value ) == -1;
			return( output );
		} )
	}
	else if( op == "contains" ){
		filtered = this.data.filter( function(x){
			var output = x[attr].search(value) !== -1;
			return( output );
		} )
	}
	else if( op == "does not contain" ){
		filtered = this.data.filter( function(x){
			var output = x[attr].search(value) == -1;
			return( output );
		} )
	}
	else{
		throw "Invalid operation: '" + op + "' passed in";
	}
	
	//	return a DataSet
	DS = new DataSet( filtered )
	return( DS );
}

//	returns attr (attribute) as an array
DataSet.prototype.get = function( attr ){
	var ar = [];
	for( var i=0; i < this.data.length; i++ ){
		ar.push( this.data[i][attr] )
	}
	dpVec = new dpVector( ar );
	return( dpVec );
}

//	returns DataSet
//	This function subsets by each unique set of idAttrs
//	then performs the specified aggregation function on
//	the value attribute
DataSet.prototype.aggregateByGroup = function( idAttrs, func, value ){
	//	idAttrs is assumed to be an array; turn into array if not already
	if( ! (idAttrs instanceof Array) ){ idAttrs=[ idAttrs ] }

	//	the original data are in "melted" or "long" form
	var melted = new DataSet(this.data);
	//	they get casted before aggregation
	var casted = [];
		
	//	create a cast-key so it's easier track rows
	for( var i=0; i < melted.data.length; i++){
		var castKey = "";
		for( var j=0; j < idAttrs.length; j++){
			var attrKey = melted.data[i][ idAttrs[j] ]
			castKey += "delimit" + attrKey
		}
		melted.data[i].castKey = DataPlay.hash(castKey)
	}
	
	//	cycle through all uncasted castKeys
	var uncastedKeys = melted.get('castKey').unique().data
	while( uncastedKeys.length > 0 ){
		// 	remove key from uncasted keys because it will get casted
		var keyToCast = uncastedKeys.shift();
		var targetRows = melted.where('castKey','in',keyToCast);
		//	ensure the new row does not have any of the old cols
		//	which were not used for subsetting or aggregated
		var newRow = {}
		for( var i=0; i < idAttrs.length; i++){		
			newRow[ idAttrs[i] ] = targetRows.data[0][ idAttrs[i] ];
		}
		newRow[value] = func( targetRows.get(value).data );
		casted.push( newRow );
	}
	casted = new DataSet( casted );
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
	return( DataPlay.mean( this.data ) )
}

//	returns dpVector with unique values
dpVector.prototype.unique = function ( ) {
	return( new dpVector( DataPlay.unique( this.data ) ) )
}

//	returns the unique intersection of the two arrays
dpVector.prototype.intersect = function( ar ){
	return( new dpVector( DataPlay.intersect( this.data ) ) )
}

//	rounds the object to the specified decimals, default=0
dpVector.prototype.round = function( decimals ){
	return( new dpVector( DataPlay.round( this.data ) ) )
}

//	returns DataSet with each unique value and frequency (count)
//	e.g., [ { value:1, count:4 } , { value:2, count:3 } ]
dpVector.prototype.distribution = function( ){
	return( DataPlay.distribution( this ) )
}




//
//	UNIT TESTS & USE CASES
//
skyscrapers = [{ "name":"Empire State Building", "country":"USA", "height": 1454 } ,
				{ "name":"Willis Tower", "country":"USA", "height": 1727 },
				{ "name":"Burj Khalifa", "country":"UEA", "height": 2717 }]

//	to load in data directly from a CSV
//	you can use jquery-csv
//	see http://code.google.com/p/jquery-csv/
/*	
*	jQuery.ajax( CSVpath, {success:function(data){
*			res = $.csv.toObjects(data);
*			rs = DataSet( res );
*		}
*	});
*/	

rs = new DataSet( skyscrapers )

//	look up rows by exact match and partial match
rs.where('country','in','USA')	//	example
if( rs.where('country','in','USA').data.length !== 2 ){ throw "where is failed!" }
if( rs.where('country','contains','U').data.length !== 3 ){ throw "where contains failed!" }
if( rs.where('country','not in','USA').data.length !== 1 ){ throw "where contains failed!" }

//	which countries are listed?
rs.get('country').unique().data
if( ! ( rs.get('country').data instanceof Array ) ){ throw "get failed to retrieve array" }
if( rs.get('country').unique().data.length !== 2 ){ throw "unique failed!" }

//	what is the average height of the three buildings?
rs.get('height').mean()
if( rs.get('height').mean() != 1966 ){ throw "Mean failed" }

//	what is the average height by country?
rs.aggregateByGroup( ['country'], DataPlay.mean , 'height' )	// result set
//	what is the average height by country and building name?
rs.aggregateByGroup( ['country','name'], DataPlay.mean , 'height' )	// result set

//	test castedMeans and demo chaining
if( rs.aggregateByGroup( ['country'], DataPlay.mean , 'height' ).where('country','in','USA').get('height').data != 1590.5 ){
	throw "casted mean failed!"
}

rs.aggregateByGroup( ['country'], DataPlay.round , 'height' )



//	clean out the unit objects
delete skyscrapers; delete rs;

console.log( "DataPlay.js unit tests complete" )



