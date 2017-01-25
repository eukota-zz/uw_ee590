

__kernel void elementwiseMatrixPower(__global float* pA, unsigned int K, __global float* pB)
{
    const int x     = get_global_id(0);
    const int y     = get_global_id(1);
    const int width = get_global_size(0);

    const int id = y * width + x;
	pB[id] = pow(pA[id],K);
}

__kernel void elementwiseMatrixPower_Manual(__global float* pA, unsigned int K, __global float* pB)
{
    const int x     = get_global_id(0);
    const int y     = get_global_id(1);
    const int width = get_global_size(0);

    const int id = y * width + x;
	float prod = pA[id];
	float out = 1.0;
	for(unsigned int i=0; i<K; i++)
		out = out*prod;
	pB[id] = out;
}


__kernel void progressiveArraySum(__global float* p1b_A, __global float* p1b_B)
{
	const unsigned int id = get_global_id(0);

	float out = 0.0;
	for(unsigned int i=0; i<=id; i++)
		out += p1b_A[i];

	p1b_B[id] = out;
}
