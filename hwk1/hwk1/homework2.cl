
// stores dot product of each float4 value in pA and pB in pC
__kernel void DotProduct_Manual(__global float4* pA, __global float4* pB, __global float* pC)
{ 
	int idx = get_global_id(0);
	pC[idx] = pA[idx].x*pB[idx].x + pA[idx].y*pB[idx].y + pA[idx].z*pB[idx].z + pA[idx].w*pB[idx].w;
}

// stores dot product of each float4 value in pA and pB in pC
__kernel void DotProduct(__global float4* pA, __global float4* pB, __global float* pC)
{ 
	int idx = get_global_id(0);
	pC[idx] = dot(pA[idx], pB[idx]);
}

// stores product of A and B summed with C in D
__kernel void MAD(__global float16* pA, __global float16* pB, __global float16* pC, __global float16* pD)
{
	int idx = get_global_id(0);
	pD[idx] = mad(pA[idx], pB[idx], pC[idx]);
}

// stores product of A and B summed with C in D
__kernel void FMA(__global float16* pA, __global float16* pB, __global float16* pC, __global float16* pD)
{
	int idx = get_global_id(0);
	pD[idx] = fma(pA[idx], pB[idx], pC[idx]);
}

// stores product of A and B summed with C in D
__kernel void FMA_Manual(__global float16* pA, __global float16* pB, __global float16* pC, __global float16* pD)
{
	int idx = get_global_id(0);
	pD[idx].s0 = pA[idx].s0*pB[idx].s0 + pC[idx].s0;
	pD[idx].s1 = pA[idx].s1*pB[idx].s1 + pC[idx].s1;
	pD[idx].s2 = pA[idx].s2*pB[idx].s2 + pC[idx].s2;
	pD[idx].s3 = pA[idx].s3*pB[idx].s3 + pC[idx].s3;
	pD[idx].s4 = pA[idx].s4*pB[idx].s4 + pC[idx].s4;
	pD[idx].s5 = pA[idx].s5*pB[idx].s5 + pC[idx].s5;
	pD[idx].s6 = pA[idx].s6*pB[idx].s6 + pC[idx].s6;
	pD[idx].s7 = pA[idx].s7*pB[idx].s7 + pC[idx].s7;
	pD[idx].s8 = pA[idx].s8*pB[idx].s8 + pC[idx].s8;
	pD[idx].s9 = pA[idx].s9*pB[idx].s9 + pC[idx].s9;
	pD[idx].sa = pA[idx].sa*pB[idx].sa + pC[idx].sa;
	pD[idx].sb = pA[idx].sb*pB[idx].sb + pC[idx].sb;
	pD[idx].sc = pA[idx].sc*pB[idx].sc + pC[idx].sc;
	pD[idx].sd = pA[idx].sd*pB[idx].sd + pC[idx].sd;
	pD[idx].se = pA[idx].se*pB[idx].se + pC[idx].se;
	pD[idx].sf = pA[idx].sf*pB[idx].sf + pC[idx].sf;
}

// stores cross product of each float4 value in pA and pB in pC
__kernel void CrossProduct(__global float4* pA, __global float4* pB, __global float4* pC)
{ 
	int idx = get_global_id(0);
	pC[idx] = cross(pA[idx], pB[idx]);
}

// stores cross product of each float4 value in pA and pB in pC
__kernel void CrossProduct_Manual(__global float4* pA, __global float4* pB, __global float4* pC)
{ 
	int idx = get_global_id(0);
	pC[idx].x =      (pA[idx].y*pB[idx].z - pA[idx].z*pB[idx].y);
	pC[idx].y = -1.0f*(pA[idx].x*pB[idx].z - pA[idx].z*pB[idx].x);
	pC[idx].z =      (pA[idx].x*pB[idx].y - pA[idx].y*pB[idx].x);
	// ignore w
}

// stores the length of pA via "fast_length" in pB
__kernel void FastLength(__global float4* pA, __global float* pB)
{ 
	int idx = get_global_id(0);
	pB[idx] = fast_length(pA[idx]);
}

// stores the length of pA via "native_sqrt" in pB
__kernel void NativeSquareRoot(__global float4* pA, __global float4* pB)
{ 
	int idx = get_global_id(0);
	pB[idx] = native_sqrt(pA[idx]);
}

// stores the length of pA via "sqrt" in pB
__kernel void SquareRoot(__global float4* pA, __global float4* pB)
{ 
	int idx = get_global_id(0);
	pB[idx] = sqrt(pA[idx]);
}
