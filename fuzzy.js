
var tempVal, humVal, coVal, smokeVal, fuzzyVal;
var fuzzyVariable = new Array();
var min = new Array();
var minTimeZ = new Array();
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

tempVal = 35;
humVal = 15;
coVal = 10;
smokeVal = 65;
fuzzyVal = fuzzyfy();

console.log("Temp : " +tempVal);
console.log("Hum : " +humVal);
console.log("CO : " +coVal);
console.log("Smoke : " +smokeVal);

console.log("\nTemperature");
console.log("Temp cold : " +fuzzyVariable[0]);
console.log("Temp med : " +fuzzyVariable[1]);
console.log("Temp hot : " +fuzzyVariable[2]);

console.log("\nHumidity");
console.log("Hum dry : " +fuzzyVariable[3]);
console.log("Hum med : " +fuzzyVariable[4]);
console.log("Hum wet : " +fuzzyVariable[5]);

console.log("\nCO");
console.log("CO low : " +fuzzyVariable[6]);
console.log("CO med : " +fuzzyVariable[7]);
console.log("CO high : " +fuzzyVariable[8]);

console.log("\nSmoke");
console.log("Smoke low : " +fuzzyVariable[9]);
console.log("Smoke med : " +fuzzyVariable[10]);
console.log("Smoke high : " +fuzzyVariable[11]);

console.log("\nFuzzy : " +fuzzyVal);

function fuzzyfy(){
    fuzzyVariable[0] = curve(tempVal, 0, 0, 20, 30);
    fuzzyVariable[1] = curve(tempVal, 20, 40, 40, 60);
    fuzzyVariable[2] = curve(tempVal, 50, 60, 100, 100);
    fuzzyVariable[3] = curve(humVal, 50, 70, 100, 100);
    fuzzyVariable[4] = curve(humVal, 20, 40, 40, 60);
    fuzzyVariable[5] = curve(humVal, 0, 0, 10, 30);
    fuzzyVariable[6] = curve(coVal, 0, 0, 20, 40);
    fuzzyVariable[7] = curve(coVal, 30, 50, 50, 70);
    fuzzyVariable[8] = curve(coVal, 50, 60, 100, 100);
    fuzzyVariable[9] = curve(smokeVal, 0, 0, 20, 50);
    fuzzyVariable[10] = curve(smokeVal, 40, 60, 60, 80);
    fuzzyVariable[11] = curve(smokeVal, 70, 100, 300, 300);

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
                        minTimeZ[index] = kebakaran(min[index]);
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

function curve(x, min, peakStart, peakEnd, max){
    if(x < min || x > max){
        return 0;
    }else if(x >= peakStart && x <= peakEnd){
        return 1;
    }else if(x >= min && x < peakStart){
        return (x - min)/(peakStart - min);
    }else if(x > peakEnd && x <= max){
        return (max - x)/(max - peakEnd);
    }else{
        return 0;
    }
}

function minimum(temp, hum, co, smoke){
    if(temp <= hum && temp <= co && temp <=smoke){
        return temp;
    }else if(hum <= temp && hum <= co && hum <= smoke){
        return hum;
    }else if(co <= temp && co <= hum && co <= smoke){
        return co;
    }else{
        return smoke;
    }
}

function normal(val){
    return (40 - 30 * val);
}

function waspada(val){
    return (70 - 35 * val);
}

function kebakaran(val){
    return (65 + 35 * val);
}