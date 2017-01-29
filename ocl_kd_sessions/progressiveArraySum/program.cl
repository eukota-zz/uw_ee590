
__kernel void progressiveArraySum(__global float* p1b_A, __global float* p1b_B)
{
	const unsigned int id = get_global_id(0);

	float out = 0.0;
	for(unsigned int i=0; i<=id; i++)
		out += p1b_A[i];

	p1b_B[id] = out;
}
