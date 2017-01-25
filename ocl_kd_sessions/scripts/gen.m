

incby = 0.1;
inKthPower = genI(262144,1,incby); % 512x512
outKthPower = genKthPower(inKthPower, 2);
csvwrite('input_512x512.csv', inKthPower);
csvwrite('output_512x512_kthpower.csv', outKthPower);


incby = 0.1;
inCumSum = genI(4096,1,incby);
outCumSum = genCumSum(inCumSum );
csvwrite('input_4096_cumsum.csv', inCumSum );
csvwrite('output_4096_cumsum.csv', outCumSum );
