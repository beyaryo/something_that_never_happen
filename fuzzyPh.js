/**
 * Created by Ikram on 18/07/2017.
 */

var tempVal, phVal, desoVal, conducVal, fuzzyVal;
var dummyLeft, dummyRight;
var fuzzyVariable = new Array();
var min = new Array();
var minTimeZ = new Array();
var probLow, probMed, probHigh;
var rule = [
    0, 0, 1, 0, 1, 1, 0, 1, 2,
    0, 0, 1, 0, 1, 2, 1, 2, 2,
    0, 1, 1, 1, 1, 2, 1, 2, 2,
    0, 0, 1, 0, 1, 2, 1, 2, 2,
    0, 1, 2, 1, 2, 2, 1, 2, 2,
    0, 1, 2, 1, 2, 2, 2, 2, 2,
    0, 1, 2, 1, 2, 2, 2, 2, 2,
    1, 1, 2, 1, 2, 2, 2, 2, 2,
    1, 2, 2, 2, 2, 2, 2, 2, 2
];

tempVal = getRandomNumber(0, 100);
phVal = getRandomNumber(1, 14);
desoVal = getRandomNumber(0, 100);
conducVal = getRandomNumber(0, 300);
//  tempVal = 10;
//  phVal= 8;
// desoVal = 34;
 //conducVal = 202;
fuzzyVal = fuzzyfy();

console.log("\nTemp : " +tempVal);
console.log("pH : " +phVal);
console.log("DO : " +desoVal);
console.log("Conduc : " +conducVal);

console.log("\nTemperature");
console.log("Temp good : " +fuzzyVariable[0]);
console.log("Temp fair : " +fuzzyVariable[1]);
console.log("Temp danger : " +fuzzyVariable[2]);

console.log("\npH");
console.log("pH optimal : " +fuzzyVariable[3]);
console.log("pH low production : " +fuzzyVariable[4]);
console.log("pH toxic : " +fuzzyVariable[5]);

console.log("\nDesolved Oxygen");
console.log("DO optimal : " +fuzzyVariable[6]);
console.log("DO fair : " +fuzzyVariable[7]);
console.log("DO poor : " +fuzzyVariable[8]);

console.log("\nConducitivity");
console.log("Con optimal : " +fuzzyVariable[9]);
console.log("Con fair : " +fuzzyVariable[10]);
console.log("Con poor : " +fuzzyVariable[11]);

console.log("\nFuzzy : " +fuzzyVal);
category();

var date = new Date(1499120028206 + (7 * 3600 * 1000));
console.log(date);

function fuzzyfy(){
    fuzzyVariable[0] = curve(tempVal, 10, 20, 20, 30, false);
	fuzzyVariable[1] = curve(tempVal, 0, 0, 10, 20, false);
    fuzzyVariable[2] = curve(tempVal, 25, 30, 50, 50, true);

    // Counting pH in good category
    fuzzyVariable[3] = curvePh(phVal, 6.51, 6.51, 9, 10);
    
    // Counting ph in bad category
    dummyLeft = curvePh(phVal, 2, 5, 6.5, 6.5);
    dummyRight = curvePh(phVal, 9, 10, 11, 11);

    if(dummyLeft > dummyRight) fuzzyVariable[4] = dummyLeft;
    else fuzzyVariable[4] = dummyRight;

    // Counting ph in toxic category
    dummyLeft = curvePh(phVal, 1, 1, 2, 5);
    dummyRight = curvePh(phVal, 11.01, 11.01, 14, 14);

    if(dummyLeft > dummyRight) fuzzyVariable[5] = dummyLeft;
    else fuzzyVariable[5] = dummyRight;

    // fuzzyVariable[3] = curve(phVal, 6.7, 6.7, 9.1, 9.9, true);
    // fuzzyVariable[4] = curve(phVal, 2, 4.9, 6.6, 6.6, false);
    // fuzzyVariable[5] = curve(phVal, 1, 1, 2, 4.9, false);
    
    fuzzyVariable[6] = curve(desoVal, 1, 4, 8, 15, false);
    fuzzyVariable[7] = curve(desoVal, 12, 15, 20, 20, true);
    fuzzyVariable[8] = curve(desoVal, 0, 0, 2, 3, true);
    fuzzyVariable[9] = curve(conducVal, 1, 2, 2, 4, false);
    fuzzyVariable[10] = curve(conducVal, 2, 4, 4, 6, false);
    fuzzyVariable[11] = curve(conducVal, 0, 1, 1, 2, true);

    // fuzzyVariable[0] = curve(tempVal, 10, 20, 20, 30, false);
	// fuzzyVariable[1] = curve(tempVal, 0, 0, 10, 20, false);
    // fuzzyVariable[2] = curve(tempVal, 25, 30, 50, 50, true);
    // fuzzyVariable[3] = curve(phVal, 6.7, 6.7, 9.1, 9.9, true);
    // fuzzyVariable[4] = curve(phVal, 2, 4.9, 6.6, 6.6, false);
    // fuzzyVariable[5] = curve(phVal, 1, 1, 2, 4.9, false);
    // fuzzyVariable[6] = curve(desoVal, 1, 4, 8, 15, false);
    // fuzzyVariable[7] = curve(desoVal, 12, 15, 20, 20, true);
    // fuzzyVariable[8] = curve(desoVal, 0, 0, 2, 3, true);
    // fuzzyVariable[9] = curve(conducVal, 1, 2, 2, 4, false);
    // fuzzyVariable[10] = curve(conducVal, 2, 4, 4, 6, false);
    // fuzzyVariable[11] = curve(conducVal, 0, 1, 1, 2, true);

    var index = 0;
    var pembilang = 0, penyebut = 0;
    for (var i = 0; i < 3; i++) {
        for (var j = 3; j < 6; j++) {
            for (var k = 6; k < 9; k++) {
                for (var l = 9; l <12; l++) {
                    min[index] = minimum(fuzzyVariable[i], fuzzyVariable[j], fuzzyVariable[k], fuzzyVariable[l]);

                    if(rule[index] == 0){
                        minTimeZ[index] = normal(min[index]);
                    }else if(rule[index] == 1){
                        minTimeZ[index] = waspada(min[index]);
                    }else{
                        minTimeZ[index] = bahaya(min[index]);
                    }

                    pembilang += min[index] * minTimeZ[index];
                    penyebut += min[index];

                    console.log(index+ ") " +minTimeZ[index] + " : " +min[index]+ " => type : " +rule[index]);

                    index++;
                }
            }
        }
    }

    return pembilang / penyebut;
}

function curve(x, min, peakStart, peakEnd, max, isCurveUp){
    if(x < min){
        return 0;
    }else if(x >= peakStart && x <= peakEnd){
        return 1;
    }else if(x >= min && x < peakStart){
        return (x - min)/(peakStart - min);
    }else if(x > peakEnd && x <= max){
        return (max - x)/(max - peakEnd);
    }else if(isCurveUp && x > max){
        return 1;
    }else{
        return 0;
    }
}

function curvePh(x, min, peakStart, peakEnd, max){
    if(x < min || x > max){
        return 0;
    }else if(x >= peakStart && x <= peakEnd){
        return 1;
    }else if(x >= min && x < peakStart){
        return (x - min)/(peakStart - min);
    }else if(x > peakEnd && x <= max){
        return (max - x)/(max - peakEnd);
    }
}

function minimum(temp, ph, deso, conduc){
    if(temp <= ph && temp <= deso && temp <=conduc){
        return temp;
    }else if(ph <= temp && ph <= deso && ph <= conduc){
        return ph;
    }else if(deso <= temp && deso <= ph && deso <= conduc){
        return deso;
    }else{
        return conduc;
    }
}

function normal(val){
    return (40 - 30 * val);
}

function waspada(val){
    return (70 - 35 * val);
}

function bahaya(val){
    return (65 + 35 * val);
}

function category(){
    probLow = curve(fuzzyVal, 0, 0, 10, 40, false);
    probMed = curve(fuzzyVal, 35, 42.5, 42.5, 70, false);
    probHigh = curve(fuzzyVal, 65, 90, 100, 100, true);

    console.log("\nCategory");
    console.log("Cat low : " +probLow);
    console.log("Cat med : " +probMed);
    console.log("Cat high : " +probHigh+ "\n");

    if(probLow > probMed){
        console.log("Category Normal");
    }else if(probMed > probHigh){
        console.log("Category Warning");
    }else{
        console.log("Category Danger");
    }
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}