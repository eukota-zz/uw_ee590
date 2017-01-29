
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
